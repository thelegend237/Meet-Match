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

type RealtimeMode = "connecting" | "connected" | "fallback" | "disabled";

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

const POLL_CONNECTED_MS = 60_000;
const POLL_FALLBACK_MS = 45_000;
const RECONNECT_BASE_MS = 4_000;
const RECONNECT_MAX_MS = 60_000;
const MAX_RECONNECT_ATTEMPTS = 5;
const AUTH_RECONNECT_DEBOUNCE_MS = 800;

export function NotificationRealtimeProvider({
  userId,
  initialUnreadCount,
  isAdmin = false,
  children,
}: NotificationRealtimeProviderProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [realtimeMode, setRealtimeMode] =
    useState<RealtimeMode>("connecting");

  const seenIds = useRef(new Set<string>());
  const pollSeededRef = useRef(false);
  const warnedRealtimeRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const setupInFlightRef = useRef(false);
  const channelGenRef = useRef(0);
  const tearingDownRef = useRef(false);

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

  const refreshUnreadCount = useCallback(async () => {
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      /* ignore */
    }
  }, []);

  const pollMissedNotifications = useCallback(async () => {
    try {
      await refreshUnreadCount();

      if (realtimeMode === "connected") return;

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
  }, [userId, handleInsert, refreshUnreadCount, realtimeMode]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let authDebounceTimer: ReturnType<typeof setTimeout> | null = null;

    const clearReconnect = () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const markFallback = () => {
      if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setRealtimeMode("disabled");
        if (!warnedRealtimeRef.current) {
          warnedRealtimeRef.current = true;
          console.info(
            "[notifications] Temps réel indisponible — notifications via polling."
          );
        }
        return;
      }

      setRealtimeMode("fallback");
    };

    const scheduleReconnect = () => {
      if (cancelled || reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        markFallback();
        return;
      }

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

    const teardownChannel = async () => {
      tearingDownRef.current = true;
      const current = channel;
      channel = null;
      if (current) {
        await supabase.removeChannel(current);
      }
      tearingDownRef.current = false;
    };

    const setupChannel = async () => {
      if (cancelled || setupInFlightRef.current) return;
      if (reconnectAttemptRef.current >= MAX_RECONNECT_ATTEMPTS) {
        markFallback();
        return;
      }

      setupInFlightRef.current = true;
      const generation = ++channelGenRef.current;

      try {
        await teardownChannel();

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session || cancelled) return;

        await supabase.realtime.setAuth(session.access_token);

        const nextChannel = supabase
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
            if (cancelled || generation !== channelGenRef.current) return;

            if (status === "SUBSCRIBED") {
              reconnectAttemptRef.current = 0;
              warnedRealtimeRef.current = false;
              setRealtimeMode("connected");
              clearReconnect();
              return;
            }

            if (status === "CLOSED" && tearingDownRef.current) {
              return;
            }

            if (
              status === "CHANNEL_ERROR" ||
              status === "TIMED_OUT" ||
              status === "CLOSED"
            ) {
              markFallback();

              if (
                !warnedRealtimeRef.current &&
                reconnectAttemptRef.current === 0
              ) {
                warnedRealtimeRef.current = true;
                console.info(
                  "[notifications] Reconnexion temps réel…",
                  err?.message ?? status
                );
              }

              scheduleReconnect();
            }
          });

        channel = nextChannel;
        setRealtimeMode("connecting");
      } finally {
        setupInFlightRef.current = false;
      }
    };

    void setupChannel();

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.access_token) return;
      if (event === "INITIAL_SESSION") return;
      if (event !== "SIGNED_IN" && event !== "TOKEN_REFRESHED") return;

      if (authDebounceTimer) clearTimeout(authDebounceTimer);
      authDebounceTimer = setTimeout(() => {
        if (cancelled) return;
        reconnectAttemptRef.current = 0;
        warnedRealtimeRef.current = false;
        pollSeededRef.current = false;
        void supabase.realtime.setAuth(session.access_token);
        void setupChannel();
      }, AUTH_RECONNECT_DEBOUNCE_MS);
    });

    return () => {
      cancelled = true;
      clearReconnect();
      if (authDebounceTimer) clearTimeout(authDebounceTimer);
      authSubscription.unsubscribe();
      void teardownChannel();
    };
  }, [userId, handleInsert]);

  useEffect(() => {
    const intervalMs =
      realtimeMode === "connected" ? POLL_CONNECTED_MS : POLL_FALLBACK_MS;

    const tick = () => {
      void pollMissedNotifications();
    };

    tick();
    const intervalId = setInterval(tick, intervalMs);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void pollMissedNotifications();
      }
    };

    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pollMissedNotifications, realtimeMode]);

  const value = useMemo(() => ({ unreadCount }), [unreadCount]);

  return (
    <NotificationRealtimeContext.Provider value={value}>
      {children}
    </NotificationRealtimeContext.Provider>
  );
}
