"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MessageCircle, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils/date";
import type {
  AdminNotification,
  AdminNotificationSummary,
} from "@/lib/admin/notifications";
import { cn } from "@/lib/utils";

interface AdminLiveDiscussionsProps {
  notifications: AdminNotification[];
  summary: AdminNotificationSummary;
}

export function AdminLiveDiscussions({
  notifications,
  summary,
}: AdminLiveDiscussionsProps) {
  const sorted = useMemo(
    () =>
      [...notifications].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt)
      ),
    [notifications]
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-primary">Discussions actives</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Conversations ouvertes avec aperçu du dernier message —{" "}
            {summary.discussions} en cours.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {sorted.map((notification) => {
          const isContact = notification.category === "contact";

          return (
            <Link
              key={notification.id}
              href={notification.href}
              className={cn(
                "mm-admin-notification-card group",
                notification.priority === "high" &&
                  "mm-admin-notification-card-priority"
              )}
            >
              <div
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                  isContact
                    ? "bg-[#ede9fe] text-[#5b3d8f]"
                    : "bg-[#fce7f3] text-[#e91e8c]"
                )}
              >
                <MessageCircle className="h-5 w-5 stroke-[1.75]" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#fce7f3] px-2.5 py-0.5 text-[11px] font-semibold text-[#be185d]">
                    {isContact ? "Contact membre" : "Discussion match"}
                  </span>
                  <span className="rounded-full bg-[#ff3d6e] px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    En attente
                  </span>
                </div>
                <h3 className="mt-2 font-semibold text-primary group-hover:text-secondary">
                  {notification.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {notification.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(notification.createdAt)}</span>
                  <span className="font-semibold text-secondary">
                    {notification.actionLabel} →
                  </span>
                </div>
              </div>

              <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-secondary" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
