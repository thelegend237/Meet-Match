"use client";

import Link from "next/link";
import { PageBackLink, PageHeader } from "@/components/layout/page-header";
import {
  Bell,
  CheckCircle,
  Clock,
  CreditCard,
  Euro,
  GitMerge,
  Heart,
  Mail,
  MailOpen,
  MessageCircle,
  MessageSquare,
  UserCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ADMIN_ICONS = {
  users: Users,
  userCheck: UserCheck,
  checkCircle: CheckCircle,
  heart: Heart,
  gitMerge: GitMerge,
  clock: Clock,
  creditCard: CreditCard,
  euro: Euro,
  messageSquare: MessageSquare,
  mailOpen: MailOpen,
  mail: Mail,
  messageCircle: MessageCircle,
  bell: Bell,
} as const;

export type AdminIconName = keyof typeof ADMIN_ICONS;

function AdminIcon({
  name,
  className,
}: {
  name: AdminIconName;
  className?: string;
}) {
  const Icon = ADMIN_ICONS[name];
  return <Icon className={className} />;
}

/* ── Page header ── */

export function AdminPageHeader(
  props: React.ComponentProps<typeof PageHeader>
) {
  return <PageHeader {...props} />;
}

export function AdminBackLink(
  props: React.ComponentProps<typeof PageBackLink>
) {
  return <PageBackLink {...props} />;
}

/* ── Section tabs ── */

export type AdminSectionTab = {
  id: string;
  label: string;
  href: string;
  count?: number;
};

export function AdminSectionTabs({
  tabs,
  activeId,
  className,
}: {
  tabs: AdminSectionTab[];
  activeId: string;
  className?: string;
}) {
  return (
    <nav
      aria-label="Sections"
      className={cn(
        "flex gap-1 overflow-x-auto rounded-xl border border-border/60 bg-card p-1 shadow-sm",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "inline-flex min-w-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-secondary text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-primary"
            )}
          >
            <span className="truncate">{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                  active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/* ── KPI cards ── */

const kpiAccent = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  success: "bg-green-100 text-green-700",
  warning: "bg-amber-100 text-amber-700",
  muted: "bg-muted text-muted-foreground",
} as const;

type KpiAccent = keyof typeof kpiAccent;

export function AdminKpiCard({
  label,
  value,
  hint,
  icon,
  accent = "primary",
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: AdminIconName;
  accent?: KpiAccent;
  className?: string;
}) {
  return (
    <div className={cn("mm-card p-4", className)}>
      <div className="flex items-start gap-3">
        {icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              kpiAccent[accent]
            )}
          >
            <AdminIcon name={icon} className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums text-primary">{value}</p>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {hint && (
            <p className="mt-0.5 text-[10px] text-muted-foreground/80">{hint}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminKpiGrid({
  children,
  cols = 3,
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
}) {
  const gridCols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  };
  return (
    <div className={cn("grid gap-3", gridCols[cols])}>{children}</div>
  );
}

/* ── Section card ── */

export function AdminSectionCard({
  title,
  description,
  children,
  className,
  headerAction,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}) {
  return (
    <div className={cn("mm-card overflow-hidden", className)}>
      {(title || headerAction) && (
        <div className="flex items-start justify-between gap-4 border-b border-border/40 px-4 py-3">
          <div>
            {title && (
              <h2 className="text-base font-semibold text-primary">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {headerAction}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ── Table shell ── */

export function AdminTableShell({
  children,
  minWidth = "640px",
  emptyMessage,
  isEmpty,
}: {
  children: React.ReactNode;
  minWidth?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
}) {
  if (isEmpty && emptyMessage) {
    return <AdminEmptyState message={emptyMessage} />;
  }

  return (
    <div className="mm-card overflow-hidden">
      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-sm"
          style={{ minWidth }}
        >
          {children}
        </table>
      </div>
    </div>
  );
}

export function AdminTableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-border/60 bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
        {children}
      </tr>
    </thead>
  );
}

export function AdminTableTh({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={cn("px-4 py-3 font-medium", className)}>{children}</th>
  );
}

export function AdminTableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-border/40">{children}</tbody>;
}

export function AdminTableRow({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <tr className={cn("transition-colors hover:bg-muted/30", className)}>
      {children}
    </tr>
  );
}

export function AdminTableTd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-4 py-3", className)}>{children}</td>;
}


export function AdminEmptyState({
  icon,
  title,
  message,
}: {
  icon?: AdminIconName;
  title?: string;
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-10 text-center">
      {icon && (
        <AdminIcon
          name={icon}
          className="mx-auto h-10 w-10 text-muted-foreground/60"
        />
      )}
      {title && (
        <p className="mt-4 font-medium text-primary">{title}</p>
      )}
      <p
        className={cn(
          "text-sm text-muted-foreground",
          title ? "mt-1" : icon ? "mt-4" : ""
        )}
      >
        {message}
      </p>
    </div>
  );
}

/* ── List item card (conversations, etc.) ── */

export function AdminListCard({
  href,
  onClick,
  children,
  className,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const classes = cn(
    "block rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-all",
    "hover:border-secondary/30 hover:bg-muted/20 hover:shadow-md",
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={cn(classes, "w-full text-left")}>
      {children}
    </button>
  );
}
