"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  Heart,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { Header } from "@/components/public/header";
import {
  LandingCoverVisual,
  LandingHeroAside,
  LandingTrustBar,
} from "@/components/public/landing-hero";
import { cn } from "@/lib/utils";
import { Reveal, ScaleHover } from "@/components/motion/motion";
import {
  INSCRIPTION_PHASE_COUNT,
  getPhaseTitle,
  type InscriptionPhase,
} from "@/lib/onboarding/step-groups";
import type { OnboardingStepId } from "@/lib/onboarding/steps";
import { ProfilePhotoPicker } from "@/components/photos/profile-photo-picker";
import { PROFILE_PHOTO_ANTI_FAKE_SHORT } from "@/lib/photos/copy";
import { MAX_PROFILE_PHOTO_MB } from "@/lib/photos/limits";

export function InscriptionPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mm-landing-page flex min-h-screen flex-col">
      <Header />

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid flex-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:gap-14 xl:grid-cols-[1.05fr_520px]">
          <LandingHeroAside />

          <div className="w-full lg:max-w-[520px] lg:justify-self-end">
            <Reveal direction="right" delay={120} className="lg:hidden">
              <LandingCoverVisual className="mb-8" />
            </Reveal>
            <ScaleHover className="w-full">
              <Reveal direction="right" delay={120}>
                {children}
              </Reveal>
            </ScaleHover>
          </div>
        </div>
      </div>

      <LandingTrustBar />
    </div>
  );
}

export function InscriptionFormCard({
  title,
  subtitle,
  step,
  phase,
  children,
  footer,
  variant = "default",
}: {
  title: string;
  subtitle?: string;
  step: OnboardingStepId;
  phase: InscriptionPhase;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "default" | "landing";
}) {
  const phaseTitle = getPhaseTitle(step);
  const isLanding = variant === "landing";

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl bg-white",
        isLanding
          ? "shadow-[0_16px_50px_rgba(46,26,71,0.12)]"
          : "border border-border/50 shadow-[0_8px_40px_rgba(46,26,71,0.08)] mm-hover-lift"
      )}
    >
      <div
        className={cn(
          "px-6 py-6 sm:px-7 sm:py-7",
          !isLanding &&
            "relative border-b border-border/40 bg-gradient-to-br from-white via-[#fdfbff] to-[#fce7f3]/30"
        )}
      >
        {!isLanding && (
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/20 via-secondary to-primary/20"
            aria-hidden
          />
        )}
        <RegisterStepProgress
          phase={phase}
          phaseTitle={phaseTitle}
          variant={isLanding ? "landing" : "default"}
        />
        <h2
          className={cn(
            "font-sans font-bold tracking-tight text-[#2e1a47]",
            isLanding
              ? "mt-4 text-[1.65rem] sm:text-[1.75rem]"
              : "mt-5 text-2xl sm:text-[1.65rem]"
          )}
        >
          {title}
        </h2>
        {subtitle && !isLanding && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      <div className="px-6 pb-2 pt-1 sm:px-7 sm:pb-3">{children}</div>
      {footer && (
        <div
          className={cn(
            "px-6 py-6 sm:px-7",
            isLanding ? "pt-2" : "border-t border-border/40 bg-[#faf8fc]/50"
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );
}

export function RegisterStepProgress({
  phase,
  phaseTitle,
  variant = "default",
}: {
  phase: InscriptionPhase;
  phaseTitle: string;
  variant?: "default" | "landing";
}) {
  const isLanding = variant === "landing";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[#6b5f7a]">
          Étape {phase} sur {INSCRIPTION_PHASE_COUNT}
        </p>
        {!isLanding && (
          <span className="rounded-full bg-secondary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-secondary">
            {phaseTitle}
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-0">
        {Array.from({ length: INSCRIPTION_PHASE_COUNT }, (_, i) => {
          const n = (i + 1) as InscriptionPhase;
          const active = n === phase;
          const done = n < phase;
          return (
            <div key={n} className="flex flex-1 items-center">
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
                  isLanding ? "h-8 w-8" : "h-9 w-9",
                  active &&
                    "bg-[#e91e8c] text-white shadow-md shadow-[#e91e8c]/30 ring-4 ring-[#e91e8c]/15",
                  done && "bg-[#e91e8c] text-white",
                  !active &&
                    !done &&
                    "border-2 border-[#e8e0f0] bg-white text-[#9b8fa8]"
                )}
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check className="h-4 w-4 stroke-[2.5]" /> : n}
              </div>
              {n < INSCRIPTION_PHASE_COUNT && (
                <div
                  className={cn(
                    "mx-1 h-1 flex-1 rounded-full transition-colors duration-300",
                    done ? "bg-[#e91e8c]/70" : "bg-[#e8e0f0]"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OptionalBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border/60 bg-white px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
        className
      )}
    >
      Optionnel
    </span>
  );
}

export function RegisterStepBanner({
  icon: Icon,
  hint,
  optional,
}: {
  icon?: LucideIcon;
  hint?: string;
  optional?: boolean;
}) {
  if (!Icon && !hint && !optional) return null;

  return (
    <div className="flex items-start gap-3.5 rounded-xl border border-border/50 bg-gradient-to-r from-[#faf8fc] to-white p-3.5 shadow-sm">
      {Icon && (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fce7f3]/80 text-secondary ring-1 ring-secondary/10">
          <Icon className="h-5 w-5 stroke-[1.75]" />
        </div>
      )}
      <div className="min-w-0 flex-1 pt-0.5">
        {optional && <OptionalBadge className="mb-2" />}
        {hint && (
          <p className="text-sm leading-relaxed text-muted-foreground">{hint}</p>
        )}
      </div>
    </div>
  );
}

export function RegisterStep({
  icon,
  hint,
  optional,
  children,
  className,
}: {
  icon?: LucideIcon;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-5", className)}>
      <RegisterStepBanner icon={icon} hint={hint} optional={optional} />
      {children}
    </div>
  );
}

export function RegisterHint({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "success";
}) {
  return (
    <p
      className={cn(
        "rounded-xl px-3.5 py-2.5 text-xs leading-relaxed",
        tone === "neutral" && "bg-[#faf8fc] text-muted-foreground",
        tone === "accent" &&
          "border border-secondary/15 bg-secondary/5 text-primary",
        tone === "success" &&
          "border border-emerald-200/80 bg-emerald-50/80 text-emerald-800"
      )}
    >
      {children}
    </p>
  );
}

export function RegisterChoiceRow({
  label,
  description,
  selected,
  onSelect,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.99]",
        selected
          ? "border-secondary/50 bg-gradient-to-r from-secondary/10 to-[#fce7f3]/30 shadow-sm ring-1 ring-secondary/20"
          : "border-border/60 bg-[#faf8fc] hover:border-secondary/25 hover:bg-white hover:shadow-sm"
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          selected
            ? "border-secondary bg-secondary"
            : "border-border/80 bg-white group-hover:border-secondary/40"
        )}
      >
        {selected && <Check className="h-3 w-3 text-white stroke-[3]" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-primary">
          {label}
        </span>
        {description && (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
            {description}
          </span>
        )}
      </span>
    </button>
  );
}

export function RegisterChoiceGrid({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; icon?: LucideIcon }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((opt) => {
        const selected = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col items-center justify-center gap-2.5 rounded-xl border px-3 py-5 transition-all duration-200 active:scale-[0.98]",
              selected
                ? "border-secondary/50 bg-gradient-to-b from-secondary/10 to-[#fce7f3]/20 shadow-sm ring-1 ring-secondary/20"
                : "border-border/60 bg-[#faf8fc] hover:border-secondary/25 hover:bg-white"
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "h-6 w-6",
                  selected ? "text-secondary" : "text-muted-foreground/70"
                )}
              />
            )}
            <span
              className={cn(
                "text-center text-sm font-semibold",
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

export function RegisterSkipButton({
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
      className="flex w-full items-center justify-center rounded-xl border border-dashed border-border/70 bg-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-secondary/30 hover:bg-[#faf8fc] hover:text-secondary"
    >
      {label}
    </button>
  );
}

export function RegisterTextarea({
  value,
  onChange,
  placeholder,
  minHint,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHint?: number;
}) {
  const length = value.trim().length;
  const minOk = minHint ? length >= minHint : true;

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-[148px] w-full resize-none rounded-xl border border-border/60 bg-[#faf8fc] px-4 py-3.5 text-[15px] leading-relaxed text-primary outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-secondary/40 focus:bg-white focus:ring-2 focus:ring-secondary/15"
      />
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        {minHint ? (
          <span
            className={cn(
              "text-muted-foreground",
              length > 0 && !minOk && "text-amber-600",
              minOk && length > 0 && "text-emerald-600"
            )}
          >
            {minOk
              ? "Longueur suffisante"
              : `${minHint - length} caractère(s) restant(s)`}
          </span>
        ) : (
          <span />
        )}
        <span className="font-medium text-muted-foreground">{length} car.</span>
      </div>
    </div>
  );
}

export function RegisterAgeRange({
  min,
  max,
  onMinChange,
  onMaxChange,
}: {
  min: number;
  max: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-secondary/15 bg-gradient-to-br from-[#faf8fc] via-white to-[#fce7f3]/25 px-5 py-6 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tranche recherchée
        </p>
        <p className="mt-2 font-sans text-4xl font-bold text-primary">
          {min}
          <span className="mx-2 text-secondary/60">–</span>
          {max}
          <span className="ml-1.5 text-lg font-semibold text-muted-foreground">
            ans
          </span>
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border/50 bg-[#faf8fc] p-4">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Âge minimum — {min} ans
          </span>
          <input
            type="range"
            min={18}
            max={80}
            value={min}
            aria-label="Âge minimum"
            onChange={(e) => {
              const next = Number(e.target.value);
              onMinChange(next);
              if (next > max) onMaxChange(next);
            }}
            className="h-2 w-full cursor-pointer accent-secondary"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Âge maximum — {max} ans
          </span>
          <input
            type="range"
            min={18}
            max={80}
            value={max}
            aria-label="Âge maximum"
            onChange={(e) => {
              const next = Number(e.target.value);
              onMaxChange(next);
              if (next < min) onMinChange(next);
            }}
            className="h-2 w-full cursor-pointer accent-secondary"
          />
        </label>
      </div>
    </div>
  );
}

export function RegisterPhotoUpload({
  preview,
  onFileSelect,
  onError,
}: {
  preview: string | null;
  onFileSelect: (file: File) => void;
  onError?: (message: string) => void;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border-2 border-dashed border-border/70 bg-gradient-to-b from-[#faf8fc] to-white px-4 py-10 transition-colors hover:border-secondary/35 hover:bg-white">
      <div className="flex flex-col items-center">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob preview
          <img
            src={preview}
            alt="Aperçu de votre photo de profil"
            className="h-36 w-36 rounded-full object-cover ring-4 ring-secondary/20 shadow-lg"
          />
        ) : (
          <div className="flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br from-primary/8 via-[#fce7f3]/40 to-secondary/15 ring-2 ring-secondary/10">
            <User className="h-14 w-14 text-secondary/45" strokeWidth={1.25} />
          </div>
        )}
        <p className="mt-5 max-w-sm text-center text-sm text-muted-foreground">
          {PROFILE_PHOTO_ANTI_FAKE_SHORT}
        </p>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          JPG, PNG ou WebP — max {MAX_PROFILE_PHOTO_MB} Mo, visage bien visible
        </p>
        <ProfilePhotoPicker
          className="mt-4 max-w-sm"
          onFile={onFileSelect}
          onError={onError}
        />
      </div>
    </div>
  );
}

export function RegisterCompletion({
  percent,
}: {
  percent: number;
}) {
  const complete = percent >= 100;

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex flex-col items-center rounded-2xl border px-5 py-8 text-center",
          complete
            ? "border-emerald-200/80 bg-gradient-to-b from-emerald-50/80 to-white"
            : "border-secondary/15 bg-gradient-to-b from-[#fce7f3]/20 to-white"
        )}
      >
        <div
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-full",
            complete ? "bg-emerald-100 text-emerald-600" : "bg-secondary/15 text-secondary"
          )}
        >
          {complete ? (
            <Check className="h-8 w-8 stroke-[2.5]" />
          ) : (
            <Heart className="h-8 w-8 fill-secondary/20 stroke-[1.75]" />
          )}
        </div>
        <p className="mt-4 font-sans text-xl font-bold text-primary">
          {complete ? "Profil complet !" : `Profil à ${percent} %`}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {complete
            ? "Vous êtes prêt(e) à découvrir des profils."
            : "C'est un excellent début — vous pourrez compléter plus tard."}
        </p>
      </div>

      <div className="rounded-xl bg-[#faf8fc] p-4">
        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className="mm-progress-animate h-full rounded-full bg-gradient-to-r from-secondary to-primary"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
        </div>
        <p className="mt-2 text-center text-xs font-medium text-muted-foreground">
          Complétion du profil
        </p>
      </div>
    </div>
  );
}

export function IconField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-primary">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground/70" />
        {children}
      </div>
    </div>
  );
}

export const fieldClass =
  "h-12 w-full rounded-xl border border-border/60 bg-[#faf8fc] pl-11 pr-4 text-[15px] text-primary outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-secondary/40 focus:bg-white focus:ring-2 focus:ring-secondary/15";

export function IconInput({
  icon,
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  icon: typeof User;
  label: string;
}) {
  return (
    <IconField label={label} icon={icon}>
      <input className={cn(fieldClass, className)} {...props} />
    </IconField>
  );
}

export function IconSelect({
  icon,
  label,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  icon: typeof User;
  label: string;
}) {
  return (
    <IconField label={label} icon={icon}>
      <select
        className={cn(fieldClass, "appearance-none pr-10", className)}
        {...props}
      >
        {children}
      </select>
    </IconField>
  );
}

export function passwordStrengthLabel(password: string): {
  label: string;
  tone: "weak" | "medium" | "strong";
  bars: number;
} {
  if (password.length < 8) {
    return { label: "Faible", tone: "weak", bars: 1 };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  if (hasLetter && hasNumber && password.length >= 10) {
    return { label: "Fort", tone: "strong", bars: 3 };
  }
  if (hasLetter && hasNumber) {
    return { label: "Moyen", tone: "medium", bars: 2 };
  }
  return { label: "Faible", tone: "weak", bars: 1 };
}

export function PasswordField({
  label = "Mot de passe",
  value,
  onChange,
  placeholder = "Minimum 8 caractères",
  autoComplete = "new-password",
  showStrength = true,
  compactStrength = false,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  showStrength?: boolean;
  compactStrength?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const strength = passwordStrengthLabel(value);

  return (
    <div>
      {label ? (
        <label className="mb-2 block text-sm font-semibold text-primary">
          {label}
        </label>
      ) : null}
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground/70" />
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={cn(fieldClass, compactStrength ? "pr-24" : "pr-11")}
        />
        {compactStrength && value.length > 0 && (
          <div className="pointer-events-none absolute right-11 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                strength.tone === "strong" && "bg-emerald-500",
                strength.tone === "medium" && "bg-amber-500",
                strength.tone === "weak" && "bg-rose-500"
              )}
            />
            <span
              className={cn(
                "text-xs font-semibold",
                strength.tone === "strong" && "text-emerald-600",
                strength.tone === "medium" && "text-amber-600",
                strength.tone === "weak" && "text-rose-600"
              )}
            >
              {strength.label}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
          aria-label={
            visible ? "Masquer le mot de passe" : "Afficher le mot de passe"
          }
        >
          {visible ? (
            <EyeOff className="h-[18px] w-[18px]" />
          ) : (
            <Eye className="h-[18px] w-[18px]" />
          )}
        </button>
      </div>
      {showStrength && value.length > 0 && !compactStrength && (
        <div className="mt-2.5 space-y-2">
          <div className="flex gap-1">
            {[1, 2, 3].map((bar) => (
              <div
                key={bar}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  bar <= strength.bars
                    ? strength.tone === "strong"
                      ? "bg-emerald-500"
                      : strength.tone === "medium"
                        ? "bg-amber-500"
                        : "bg-rose-500"
                    : "bg-border/80"
                )}
              />
            ))}
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              Lettres + chiffres, 8 caractères min.
            </span>
            <span
              className={cn(
                "font-semibold",
                strength.tone === "strong" && "text-emerald-600",
                strength.tone === "medium" && "text-amber-600",
                strength.tone === "weak" && "text-rose-600"
              )}
            >
              {strength.label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export function PrimaryFormButton({
  children,
  pending,
  type = "button",
  onClick,
  className,
}: {
  children: React.ReactNode;
  pending?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={pending}
      className={cn(
        "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#e91e8c] text-base font-semibold text-white shadow-lg shadow-[#e91e8c]/25 transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60",
        className
      )}
    >
      {pending ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Chargement…
        </>
      ) : (
        <>
          {children}
          <ArrowRight className="h-5 w-5 stroke-[2]" />
        </>
      )}
    </button>
  );
}

export function RegisterStepFooter({
  onBack,
  onNext,
  onSkip,
  progress,
  nextLabel = "Continuer",
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
    <div className="space-y-4">
      {onSkip && (
        <RegisterSkipButton label={skipLabel} onClick={onSkip} />
      )}

      <div className="flex gap-3">
        {showBack && onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={pending}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-[#faf8fc] disabled:opacity-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </button>
        )}
        <PrimaryFormButton
          pending={pending}
          onClick={onNext}
          className={showBack && onBack ? "flex-1" : undefined}
        >
          {nextLabel}
        </PrimaryFormButton>
      </div>

      <div className="space-y-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="mm-progress-animate h-full rounded-full bg-gradient-to-r from-primary/70 to-secondary"
            style={{ width: `${Math.min(100, progress)}%` }}
          />
        </div>
        <p className="text-center text-[11px] font-medium text-muted-foreground">
          {progress} % du parcours
        </p>
      </div>
    </div>
  );
}

export function LoginHint() {
  return (
    <p className="text-center text-sm text-muted-foreground">
      Vous avez déjà un compte ?{" "}
      <Link
        href="/connexion"
        className="font-semibold text-secondary hover:underline"
      >
        Se connecter
      </Link>
    </p>
  );
}
