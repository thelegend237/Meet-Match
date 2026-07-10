"use client";

import Link from "next/link";
import { AlertCircle, Lock } from "lucide-react";
import { RegistrationPaymentButton } from "@/components/user/registration-payment-button";
import { needsRegistrationActivation } from "@/lib/auth/payment-access";
import {
  formatDisplayPrice,
  getRegistrationFee,
  PRICING_TEST_MODE,
} from "@/lib/pricing";
import type { Profile } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface PaymentActivationBannerProps {
  profile: Profile;
  /** Barre fixe au-dessus de la bottom nav (mobile). */
  variant?: "inline" | "sticky";
  className?: string;
}

function activationCopy(profile: Profile) {
  const fee = getRegistrationFee(profile.country_code);
  const priceLabel = formatDisplayPrice(fee.amount, fee.currency);

  if (PRICING_TEST_MODE) {
    return {
      title: "Compte non activé",
      description:
        "Vous pouvez parcourir les profils. Activez gratuitement votre compte pour envoyer des likes et accéder aux matchs.",
      ctaShort: "Activer gratuitement",
      priceHint: priceLabel,
    };
  }

  return {
    title: "Activation requise",
    description: `Parcourez les profils gratuitement. Activez votre compte (${priceLabel}) pour liker et être mis en relation.`,
    ctaShort: "Activer mon compte",
    priceHint: priceLabel,
  };
}

export function PaymentActivationBanner({
  profile,
  variant = "inline",
  className,
}: PaymentActivationBannerProps) {
  if (!needsRegistrationActivation(profile)) return null;

  const fee = getRegistrationFee(profile.country_code);
  const copy = activationCopy(profile);

  if (variant === "sticky") {
    return (
      <div
        className={cn(
          "fixed inset-x-0 z-40 border-t border-amber-200/80 bg-gradient-to-r from-amber-50 to-[#fff7ed] px-4 py-3 shadow-[0_-8px_24px_rgba(46,26,71,0.08)] md:hidden",
          "bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))]",
          className
        )}
        role="status"
        aria-live="polite"
      >
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Lock className="h-4 w-4 text-amber-800" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-950">{copy.title}</p>
            <p className="text-xs text-amber-900/80">Likes et matchs bloqués</p>
          </div>
          <RegistrationPaymentButton
            amount={fee.amount}
            currency={fee.currency}
            skipConfirm={PRICING_TEST_MODE}
            className="h-11 min-h-11 shrink-0 rounded-full px-4 text-xs font-semibold"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mm-alert-banner border-amber-200/90 bg-gradient-to-r from-amber-50 via-[#fff7ed] to-amber-50/80 shadow-sm",
        className
      )}
      role="status"
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-5 w-5 text-amber-800" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-amber-950">{copy.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-900/85">
              {copy.description}
            </p>
            {PRICING_TEST_MODE && (
              <p className="mt-2 text-xs font-medium text-amber-800/90">
                Phase test · {copy.priceHint} · aucun paiement réel
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <RegistrationPaymentButton
            amount={fee.amount}
            currency={fee.currency}
            skipConfirm={PRICING_TEST_MODE}
            className="w-full sm:w-auto"
          />
          <Link
            href="/paiements"
            className="text-center text-sm font-medium text-amber-900 underline-offset-2 hover:underline sm:px-3"
          >
            Voir le détail
          </Link>
        </div>
      </div>
    </div>
  );
}
