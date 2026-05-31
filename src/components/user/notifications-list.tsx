"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "@/lib/utils/date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";
import type { Notification } from "@/lib/types/database";

const MATCH_NOTIFICATION_TYPES = new Set([
  "match_proposed",
  "matching_payment_required",
  "chat_opened",
  "match_success",
  "match_failed",
  "payment_confirmed",
]);

function getNotificationLink(notification: Notification): string | null {
  if (notification.type === "chat_opened") {
    const chatId = notification.metadata?.chat_id;
    if (typeof chatId === "string") return `/messages/${chatId}`;
  }

  if (!MATCH_NOTIFICATION_TYPES.has(notification.type)) return null;
  const matchId = notification.metadata?.match_id;
  if (typeof matchId === "string") {
    return `/matchs?match=${matchId}`;
  }
  if (
    notification.type === "match_proposed" ||
    notification.type === "matching_payment_required"
  ) {
    return "/matchs";
  }
  return null;
}

interface NotificationsListProps {
  notifications: Notification[];
}

export function NotificationsList({ notifications }: NotificationsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const unread = notifications.filter((n) => !n.is_read);

  function handleMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  function handleMarkRead(id: string) {
    startTransition(async () => {
      await markNotificationRead(id);
      router.refresh();
    });
  }

  if (notifications.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <p className="text-muted-foreground">Aucune notification pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unread.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={handleMarkAll}
          >
            Tout marquer comme lu
          </Button>
        </div>
      )}
      <ul className="space-y-3">
        {notifications.map((n) => {
          const link = getNotificationLink(n);
          const content = (
            <>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-primary">{n.title}</h3>
                {!n.is_read && <Badge variant="secondary">Nouveau</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{n.content}</p>
              <p className="mt-2 text-xs text-muted-foreground/70">
                {formatDistanceToNow(n.created_at)}
              </p>
              {link && (
                <p className="mt-2 text-sm font-medium text-secondary">
                  {n.type === "chat_opened"
                    ? "Ouvrir la discussion →"
                    : "Voir le match →"}
                </p>
              )}
            </>
          );

          return (
            <li
              key={n.id}
              className={`rounded-xl border p-4 transition-colors ${
                n.is_read
                  ? "border-border bg-card"
                  : "border-secondary/30 bg-accent/30"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {link ? (
                  <Link
                    href={link}
                    className="min-w-0 flex-1 hover:opacity-90"
                    onClick={() => !n.is_read && handleMarkRead(n.id)}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="min-w-0 flex-1">{content}</div>
                )}
                {!n.is_read && !link && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleMarkRead(n.id)}
                  >
                    Lu
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
