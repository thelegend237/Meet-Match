import Link from "next/link";
import { Bell } from "lucide-react";
import { fetchRecentNotifications } from "@/lib/notifications/queries";
import {
  getNotificationHref,
  NOTIFICATION_TYPE_LABELS,
} from "@/lib/notifications/display";
import { formatDistanceToNow } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

interface DashboardNotificationsPreviewProps {
  userId: string;
}

export async function DashboardNotificationsPreview({
  userId,
}: DashboardNotificationsPreviewProps) {
  const notifications = await fetchRecentNotifications(userId, 5);

  return (
    <div className="mm-card lg:col-span-2">
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
        <h2 className="font-sans text-lg font-bold text-primary">
          Notifications récentes
        </h2>
        <Link
          href="/notifications"
          className="text-sm font-medium text-secondary hover:underline"
        >
          Voir toutes
        </Link>
      </div>
      {notifications.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground">
          Aucune notification pour le moment.
        </div>
      ) : (
        <div className="divide-y divide-border/40 px-2">
          {notifications.map((n) => {
            const href = getNotificationHref(n);
            const typeLabel = NOTIFICATION_TYPE_LABELS[n.type] ?? n.type;
            const row = (
              <>
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    n.is_read ? "bg-muted" : "bg-accent"
                  )}
                >
                  <Bell
                    className={cn(
                      "h-5 w-5",
                      n.is_read ? "text-muted-foreground" : "text-secondary"
                    )}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {typeLabel}
                    </span>
                    {!n.is_read && (
                      <span className="rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-semibold text-secondary">
                        Nouveau
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm font-medium text-foreground">
                    {n.title}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {n.content}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {formatDistanceToNow(n.created_at)}
                  </p>
                </div>
              </>
            );

            return href ? (
              <Link
                key={n.id}
                href={href}
                className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/30"
              >
                {row}
              </Link>
            ) : (
              <div
                key={n.id}
                className="flex items-center gap-4 px-4 py-3.5"
              >
                {row}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
