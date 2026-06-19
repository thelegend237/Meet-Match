import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  actionHref,
  actionLabel,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mm-card flex flex-col items-center px-6 py-12 text-center sm:px-10 sm:py-14",
        className
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
        <Icon className="h-8 w-8 text-secondary/70" />
      </div>
      <h2 className="mt-5 font-sans text-xl font-bold text-primary">{title}</h2>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action}
      {!action && actionHref && actionLabel && (
        <Button variant="secondary" className="mt-6 rounded-full" asChild>
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      )}
    </div>
  );
}
