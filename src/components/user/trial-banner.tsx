"use client";

import Link from "next/link";
import { Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatTrialEndDate,
  getTrialDaysRemaining,
  isProfileOnTrial,
} from "@/lib/trial";
import type { Profile } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface TrialBannerProps {
  profile: Profile;
  className?: string;
  /** Compact strip for shell / discover */
  variant?: "inline" | "urgent";
}

export function TrialBanner({
  profile,
  className,
  variant = "inline",
}: TrialBannerProps) {
  if (!isProfileOnTrial(profile)) return null;

  const days = getTrialDaysRemaining(profile);
  const until = formatTrialEndDate(profile);
  const urgent = variant === "urgent" || days <= 3;

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 sm:px-5 sm:py-4",
        urgent
          ? "border-amber-200/90 bg-gradient-to-r from-amber-50 via-[#fff7ed] to-amber-50/80"
          : "border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/70",
        className
      )}
      role="status"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
              urgent ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
            )}
          >
            {urgent ? (
              <Sparkles className="h-5 w-5" />
            ) : (
              <Gift className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm font-semibold",
                urgent ? "text-amber-950" : "text-emerald-950"
              )}
            >
              {urgent
                ? days <= 1
                  ? "Dernier jour d'essai"
                  : `Essai : ${days} jours restants`
                : `Essai gratuit — ${days} jour${days > 1 ? "s" : ""} restant${days > 1 ? "s" : ""}`}
            </p>
            <p
              className={cn(
                "mt-0.5 text-xs leading-relaxed sm:text-sm",
                urgent ? "text-amber-900/85" : "text-emerald-900/80"
              )}
            >
              {urgent
                ? `Activez votre compte avant le ${until ?? "…"} pour continuer à liker et être mis en relation.`
                : `Likes et mises en relation inclus jusqu'au ${until ?? "…"}.`}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          variant={urgent ? "secondary" : "outline"}
          className="shrink-0 rounded-full"
          asChild
        >
          <Link href="/paiements">
            {urgent ? "Activer mon compte" : "Voir mon essai"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
