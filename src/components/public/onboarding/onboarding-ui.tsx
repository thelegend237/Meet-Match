"use client";

import { Check, ChevronLeft, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function OnboardingShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[min(720px,85dvh)] w-full flex-col rounded-3xl bg-card shadow-xl ring-1 ring-border/40",
        className
      )}
    >
      {children}
    </div>
  );
}

export function StepIllustration({
  icon: Icon,
  gradient = "from-secondary/20 via-accent to-primary/10",
}: {
  icon: LucideIcon;
  gradient?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-36 shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br sm:h-40",
        gradient
      )}
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-secondary/15 blur-2xl" />
      <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-primary/10 blur-xl" />
      <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-card/90 shadow-lg ring-1 ring-white/60">
        <Icon className="h-10 w-10 text-secondary" strokeWidth={1.5} />
      </div>
    </div>
  );
}

export function StepHeader({
  title,
  subtitle,
  optional,
}: {
  title: string;
  subtitle?: string;
  optional?: boolean;
}) {
  return (
    <div className="px-5 pt-5 pb-2">
      {optional && (
        <span className="mb-2 inline-block rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Optionnel
        </span>
      )}
      <h2 className="font-serif text-2xl font-bold leading-tight text-primary">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function StepBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex-1 overflow-y-auto px-5 pb-4", className)}>
      {children}
    </div>
  );
}

export function ChoiceRow({
  label,
  selected,
  onSelect,
  description,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-4 text-left transition-all active:scale-[0.99]",
        selected
          ? "border-secondary/40 bg-secondary/10 shadow-sm"
          : "border-border/60 bg-muted/30 hover:border-secondary/20 hover:bg-muted/50"
      )}
    >
      <div className="min-w-0">
        <span className="block font-medium text-primary">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {description}
          </span>
        )}
      </div>
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected
            ? "border-primary bg-primary"
            : "border-muted-foreground/30 bg-card"
        )}
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-white" />}
      </span>
    </button>
  );
}

export function ChoiceGrid({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: { value: string; label: string; icon?: LucideIcon }[];
  value: string;
  onChange: (v: string) => void;
  columns?: 2 | 3;
}) {
  return (
    <div
      className={cn(
        "grid gap-2",
        columns === 3 ? "grid-cols-3" : "grid-cols-2"
      )}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col items-center justify-center gap-2 rounded-2xl border px-3 py-4 transition-all active:scale-[0.98]",
              selected
                ? "border-secondary bg-secondary/10 shadow-sm"
                : "border-border/60 bg-muted/20 hover:bg-muted/40"
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "h-6 w-6",
                  selected ? "text-secondary" : "text-muted-foreground"
                )}
              />
            )}
            <span
              className={cn(
                "text-center text-sm font-medium",
                selected ? "text-primary" : "text-muted-foreground"
              )}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SkipOption({
  label = "Je préfère ne pas le dire",
  onClick,
}: {
  label?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex w-full items-center justify-between rounded-2xl border border-dashed border-border/80 bg-transparent px-4 py-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/30"
    >
      {label}
      <span className="h-5 w-5 rounded-full border-2 border-muted-foreground/25" />
    </button>
  );
}

export function StepFooter({
  onBack,
  onNext,
  onSkip,
  progress,
  nextLabel,
  pending,
  showBack = true,
  skipLabel,
}: {
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  progress: number;
  nextLabel?: string;
  pending?: boolean;
  showBack?: boolean;
  skipLabel?: string;
}) {
  return (
    <div className="shrink-0 border-t border-border/50 bg-card px-4 py-3">
      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="mb-3 w-full py-1 text-center text-sm font-medium text-muted-foreground hover:text-secondary"
        >
          {skipLabel ?? "Passer cette étape"}
        </button>
      )}
      <div className="flex items-center gap-3">
        {showBack && onBack ? (
          <button
            type="button"
            onClick={onBack}
            disabled={pending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-muted disabled:opacity-40"
            aria-label="Retour"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : (
          <span className="w-11 shrink-0" />
        )}
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={pending}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-lg shadow-secondary/30 transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
          aria-label={nextLabel ?? "Continuer"}
        >
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Check className="h-6 w-6" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </div>
  );
}

export function LargeInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-border/60 bg-muted/20 px-4 py-4 text-base text-primary placeholder:text-muted-foreground/70 focus:border-secondary/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-secondary/20",
        className
      )}
      {...props}
    />
  );
}

export function LargeTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[140px] w-full resize-none rounded-2xl border border-border/60 bg-muted/20 px-4 py-4 text-base text-primary placeholder:text-muted-foreground/70 focus:border-secondary/50 focus:bg-card focus:outline-none focus:ring-2 focus:ring-secondary/20",
        className
      )}
      {...props}
    />
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </label>
  );
}

export function CloseLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card/80 text-primary shadow-sm backdrop-blur hover:bg-card"
      aria-label="Fermer"
    >
      <X className="h-5 w-5" />
    </a>
  );
}
