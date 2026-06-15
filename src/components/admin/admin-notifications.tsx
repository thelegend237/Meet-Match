"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bell,
  ChevronRight,
  Heart,
  MessageCircle,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { formatDistanceToNow } from "@/lib/utils/date";
import type {
  AdminNotification,
  AdminNotificationCategory,
  AdminNotificationSummary,
} from "@/lib/admin/notifications";
import { cn } from "@/lib/utils";

type FilterId = "all" | "discussions" | "matching" | "members";

const CATEGORY_META: Record<
  AdminNotificationCategory,
  {
    label: string;
    icon: typeof Bell;
    iconClass: string;
    badgeClass: string;
  }
> = {
  contact: {
    label: "Contact",
    icon: MessageCircle,
    iconClass: "bg-[#ede9fe] text-[#5b3d8f]",
    badgeClass: "bg-[#ede9fe] text-[#5b3d8f]",
  },
  match_chat: {
    label: "Discussion match",
    icon: MessageCircle,
    iconClass: "bg-[#fce7f3] text-[#e91e8c]",
    badgeClass: "bg-[#fce7f3] text-[#e91e8c]",
  },
  matching: {
    label: "Like réciproque",
    icon: Heart,
    iconClass: "bg-[#fce7f3] text-[#e91e8c]",
    badgeClass: "bg-[#fce7f3] text-[#be185d]",
  },
  match_pending: {
    label: "Paiement match",
    icon: Wallet,
    iconClass: "bg-[#ffedd5] text-[#c2410c]",
    badgeClass: "bg-[#ffedd5] text-[#c2410c]",
  },
  registration: {
    label: "Inscription",
    icon: Wallet,
    iconClass: "bg-[#ffedd5] text-[#c2410c]",
    badgeClass: "bg-[#ffedd5] text-[#c2410c]",
  },
  new_member: {
    label: "Nouveau membre",
    icon: UserPlus,
    iconClass: "bg-[#dcfce7] text-[#15803d]",
    badgeClass: "bg-[#dcfce7] text-[#15803d]",
  },
};

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "discussions", label: "Discussions" },
  { id: "matching", label: "Matchs" },
  { id: "members", label: "Membres" },
];

function matchesFilter(notification: AdminNotification, filter: FilterId) {
  if (filter === "all") return true;
  if (filter === "discussions") {
    return notification.category === "contact" || notification.category === "match_chat";
  }
  if (filter === "matching") {
    return (
      notification.category === "matching" || notification.category === "match_pending"
    );
  }
  return (
    notification.category === "registration" || notification.category === "new_member"
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof Bell;
  iconClass: string;
}) {
  return (
    <article className="mm-admin-stat-card">
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11",
            iconClass
          )}
        >
          <Icon className="h-[18px] w-[18px] stroke-[1.75] sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-[1.65rem] font-bold leading-none text-primary sm:text-[1.75rem]">
            {value}
          </p>
          <p className="mt-2 text-[11px] font-semibold text-emerald-600">{hint}</p>
        </div>
      </div>
    </article>
  );
}

interface AdminNotificationsProps {
  notifications: AdminNotification[];
  summary: AdminNotificationSummary;
  adminName: string;
}

export function AdminNotifications({
  notifications,
  summary,
  adminName,
}: AdminNotificationsProps) {
  const [filter, setFilter] = useState<FilterId>("all");

  const filtered = useMemo(
    () => notifications.filter((n) => matchesFilter(n, filter)),
    [notifications, filter]
  );

  const filterCounts = useMemo(
    () => ({
      all: notifications.length,
      discussions: summary.discussions,
      matching: summary.matching,
      members: summary.members,
    }),
    [notifications.length, summary]
  );

  return (
    <div className="space-y-5">
      <section className="mm-admin-notification-hero">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-semibold text-[#5b3d8f]">
              <Bell className="h-3.5 w-3.5" />
              Centre de notifications
            </div>
            <h2 className="font-serif text-xl font-bold text-primary sm:text-2xl">
              Bonjour {adminName}, voici ce qui demande votre attention
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Discussions en attente, likes réciproques, paiements et nouveaux
              membres — tout est regroupé ici pour faciliter votre suivi.
            </p>
          </div>
          {summary.actionable > 0 && (
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-center shadow-sm">
              <p className="text-3xl font-bold text-secondary">{summary.actionable}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                À traiter
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Alertes totales"
          value={summary.total}
          hint={`${summary.actionable} prioritaires`}
          icon={Bell}
          iconClass="bg-[#ede9fe] text-[#5b3d8f]"
        />
        <SummaryCard
          label="Discussions"
          value={summary.discussions}
          hint="Contacts et matchs"
          icon={MessageCircle}
          iconClass="bg-[#fce7f3] text-[#e91e8c]"
        />
        <SummaryCard
          label="Matchs"
          value={summary.matching}
          hint="À proposer ou suivre"
          icon={Heart}
          iconClass="bg-[#fce7f3] text-[#e91e8c]"
        />
        <SummaryCard
          label="Membres"
          value={summary.members}
          hint="Inscriptions récentes"
          icon={Users}
          iconClass="bg-[#dcfce7] text-[#15803d]"
        />
      </section>

      <nav
        aria-label="Filtrer les notifications"
        className="flex gap-1 overflow-x-auto rounded-xl border border-border/60 bg-card p-1 shadow-sm"
      >
        {FILTERS.map((item) => {
          const active = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-secondary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-primary"
              )}
            >
              {item.label}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                  active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {filterCounts[item.id]}
              </span>
            </button>
          );
        })}
      </nav>

      {filtered.length === 0 ? (
        <div className="mm-admin-notification-empty">
          <Bell className="h-12 w-12 text-secondary/30" />
          <h3 className="mt-4 font-serif text-lg font-bold text-primary">
            Rien à signaler pour le moment
          </h3>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {filter === "all"
              ? "Vous êtes à jour. Les nouvelles alertes apparaîtront ici dès qu'une action sera nécessaire."
              : "Aucune notification dans cette catégorie pour l'instant."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((notification) => {
            const meta = CATEGORY_META[notification.category];
            const Icon = meta.icon;
            const isPriority = notification.priority === "high";

            return (
              <Link
                key={notification.id}
                href={notification.href}
                className={cn(
                  "mm-admin-notification-card group",
                  isPriority && "mm-admin-notification-card-priority"
                )}
              >
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
                    meta.iconClass
                  )}
                >
                  <Icon className="h-5 w-5 stroke-[1.75]" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        meta.badgeClass
                      )}
                    >
                      {meta.label}
                    </span>
                    {isPriority && (
                      <span className="rounded-full bg-[#ff3d6e] px-2.5 py-0.5 text-[11px] font-semibold text-white">
                        Prioritaire
                      </span>
                    )}
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
      )}
    </div>
  );
}
