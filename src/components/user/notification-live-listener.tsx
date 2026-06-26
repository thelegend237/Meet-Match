"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  getNotificationActionLabel,
  getNotificationHref,
} from "@/lib/notifications/display";
import type { Notification } from "@/lib/types/database";

interface NotificationLiveListenerProps {
  userId: string;
  isAdmin?: boolean;
}

export function NotificationLiveListener({
  userId,
  isAdmin = false,
}: NotificationLiveListenerProps) {
  const seenIds = useRef(new Set<string>());

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          if (!notification?.id || seenIds.current.has(notification.id)) return;
          seenIds.current.add(notification.id);

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
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, isAdmin]);

  return null;
}
