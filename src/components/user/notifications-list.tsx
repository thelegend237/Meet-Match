"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
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
  const [items, setItems] = useState(notifications);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const unread = items.filter((n) => !n.is_read);

  function handleMarkAll() {
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    startTransition(async () => {
      const prev = items;
      try {
        await markAllNotificationsRead();
      } catch {
        setItems(prev);
        router.refresh();
      }
    });
  }

  function handleMarkRead(id: string) {
    setPendingId(id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    startTransition(async () => {
      const prev = items;
      try {
        await markNotificationRead(id);
      } catch {
        setItems(prev);
        router.refresh();
      } finally {
        setPendingId(null);
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="mm-card px-6 py-12 text-center">
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
      <div className="space-y-3">
        {items.map((n) => {
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
            <div
              key={n.id}
              className={
                n.is_read
                  ? "mm-card p-4"
                  : "mm-card border-secondary/25 bg-accent/40 p-4"
              }
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
                    {pendingId === n.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Lu"
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
