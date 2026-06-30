"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { getUnreadCount } from "@/lib/actions/notifications";
import { toast } from "@/hooks/use-toast";
import {
  getNotificationActionLabel,
  getNotificationHref,
} from "@/lib/notifications/display";
import { dispatchNotificationInsert } from "@/lib/notifications/realtime-events";
import type { Notification } from "@/lib/types/database";

type NotificationRealtimeContextValue = {
  unreadCount: number;
};

const NotificationRealtimeContext =
  createContext<NotificationRealtimeContextValue | null>(null);

export function useNotificationRealtime() {
  return useContext(NotificationRealtimeContext);
}

interface NotificationRealtimeProviderProps {
  userId: string;
  initialUnreadCount: number;
  isAdmin?: boolean;
  children: React.ReactNode;
}

const POLL_MS_REALTIME_OK = 30_000;
const POLL_MS_REALTIME_DOWN = 12_000;
const RECONNECT_BASE_MS = 3_000;
const RECONNECT_MAX_MS = 30_000;

export function NotificationRealtimeProvider({
  userId,
  initialUnreadCount,
  isAdmin = false,
  children,
}: NotificationRealtimeProviderProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const seenIds = useRef(new Set<string>());
  const realtimeOkRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const warnedRealtimeRef = useRef(false);
  const pollSeededRef = useRef(false);

  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  const handleInsert = useCallback(
    (notification: Notification) => {
      if (!notification?.id || seenIds.current.has(notification.id)) return;
      seenIds.current.add(notification.id);

      setUnreadCount((count) => count + 1);
      dispatchNotificationInsert(notification);

      const href = getNotificationHref(notification, { isAdmin });
      const actionLabel = getNotificationActionLabel(notification, { isAdmin });

      toast({
        title: notification.title,
        description: notification.content,
        action:
          href && actionLabel ? (
            <Link
              href={href}
              className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium"
            >
              {actionLabel.replace(/\s*→$/, "")}
            </Link>
          ) : undefined,
      });

      router.refresh();
    },
    [isAdmin, router]
  );

  const pollNotifications = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);

      if (realtimeOkRef.current) return;

      const supabase = createClient();
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error || !data?.length) return;

      if (!pollSeededRef.current) {
        pollSeededRef.current = true;
        for (const row of data) {
          seenIds.current.add((row as Notification).id);
        }
        return;
      }

      for (const row of data) {
        const notification = row as Notification;
        if (!notification.is_read) {
          handleInsert(notification);
        }
      }
    } catch {
      /* ignore */
    }
  }, [userId, handleInsert]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const clearReconnect = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      clearReconnect();
      const delay = Math.min(
        RECONNECT_BASE_MS * 2 ** reconnectAttemptRef.current,
        RECONNECT_MAX_MS
      );
      reconnectAttemptRef.current += 1;
      reconnectTimer = setTimeout(() => {
        void setupChannel();
      }, delay);
    };

    const setupChannel = async () => {
      if (cancelled) return;

      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session || cancelled) return;

      await supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel(`notifications-live:${userId}`, {
          config: { broadcast: { self: false } },
        })
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            handleInsert(payload.new as Notification);
          }
        )
        .subscribe((status, err) => {
          if (cancelled) return;

          if (status === "SUBSCRIBED") {
            realtimeOkRef.current = true;
            reconnectAttemptRef.current = 0;
            warnedRealtimeRef.current = false;
            return;
          }

          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            realtimeOkRef.current = false;

            if (!warnedRealtimeRef.current) {
              warnedRealtimeRef.current = true;
              console.warn(
                "[notifications] Realtime indisponible — secours polling actif.",
                err?.message ?? status
              );
            }

            scheduleReconnect();
          }
        });
    };

    void setupChannel();

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        void supabase.realtime.setAuth(session.access_token);
        reconnectAttemptRef.current = 0;
        void setupChannel();
      }
    });

    return () => {
      cancelled = true;
      clearReconnect();
      authSubscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, handleInsert]);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    const tick = () => {
      void pollNotifications();
    };

    const resetInterval = () => {
      clearInterval(intervalId);
      intervalId = setInterval(
        tick,
        realtimeOkRef.current ? POLL_MS_REALTIME_OK : POLL_MS_REALTIME_DOWN
      );
    };

    tick();
    resetInterval();

    const checkInterval = setInterval(resetInterval, 5_000);

    const onVisible = () => {
      if (document.visibilityState === "visible") void pollNotifications();
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(intervalId);
      clearInterval(checkInterval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pollNotifications]);

  const value = useMemo(() => ({ unreadCount }), [unreadCount]);

  return (
    <NotificationRealtimeContext.Provider value={value}>
      {children}
    </NotificationRealtimeContext.Provider>
  );
}
