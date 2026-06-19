"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils/date";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/actions/notifications";
import {
  getNotificationActionLabel,
  getNotificationHref,
  NOTIFICATION_TYPE_LABELS,
} from "@/lib/notifications/display";
import type { Notification } from "@/lib/types/database";

interface NotificationsListProps {
  notifications: Notification[];
  isAdmin?: boolean;
}

export function NotificationsList({
  notifications,
  isAdmin = false,
}: NotificationsListProps) {
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
        router.refresh();
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
        router.refresh();
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
          const link = getNotificationHref(n, { isAdmin });
          const actionLabel = getNotificationActionLabel(n, { isAdmin });
          const typeLabel = NOTIFICATION_TYPE_LABELS[n.type] ?? n.type;

          const content = (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {typeLabel}
                </span>
                {!n.is_read && <Badge variant="secondary">Nouveau</Badge>}
              </div>
              <h3 className="mt-2 font-medium text-primary">{n.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{n.content}</p>
              <p className="mt-2 text-xs text-muted-foreground/70">
                {formatDistanceToNow(n.created_at)}
              </p>
              {link && actionLabel && (
                <p className="mt-2 text-sm font-medium text-secondary">
                  {actionLabel}
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
