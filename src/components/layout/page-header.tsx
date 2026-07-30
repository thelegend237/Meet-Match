import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageBackLink({
  href,
  label = "Retour",
  className,
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-secondary",
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  action,
  className,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-1", className)}>
      {backHref && <PageBackLink href={backHref} label={backLabel} />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-sans text-xl font-bold tracking-tight text-primary sm:text-2xl md:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-snug text-muted-foreground sm:mt-2 sm:text-base sm:leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
    </header>
  );
}

export function PageStack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("mm-page-stack", className)}>{children}</div>;
}
