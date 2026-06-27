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

export function NotificationRealtimeProvider({
  userId,
  initialUnreadCount,
  isAdmin = false,
  children,
}: NotificationRealtimeProviderProps) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const seenIds = useRef(new Set<string>());

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

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications-live:${userId}`)
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
        if (status === "CHANNEL_ERROR") {
          console.error("[notifications] realtime:", err?.message ?? status);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, handleInsert]);

  /** Secours si Realtime indisponible (publication non activée, etc.). */
  useEffect(() => {
    const syncUnread = () => {
      void getUnreadCount()
        .then((count) => setUnreadCount(count))
        .catch(() => undefined);
    };

    const interval = window.setInterval(syncUnread, 30_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") syncUnread();
    };

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const value = useMemo(() => ({ unreadCount }), [unreadCount]);

  return (
    <NotificationRealtimeContext.Provider value={value}>
      {children}
    </NotificationRealtimeContext.Provider>
  );
}
