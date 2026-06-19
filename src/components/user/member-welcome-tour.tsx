"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Compass,
  Heart,
  Headphones,
  Layers,
  MessageSquare,
  Sparkles,
  X,
  ChevronRight,
  ChevronLeft,
  Map,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepTransition } from "@/components/motion/motion";
import {
  isMemberTourCompleted,
  markMemberTourCompleted,
} from "@/lib/user/member-tour";
import { cn } from "@/lib/utils";

type TourStep = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  tip?: string;
  href?: string;
  hrefLabel?: string;
};

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    icon: Map,
    title: "Bienvenue sur Meet & Match",
    description:
      "Vous n'êtes pas seul : notre équipe accompagne chaque étape. Ce guide rapide vous montre où cliquer pour profiter de l'application.",
    tip: "2 minutes — vous pourrez le revoir dans Paramètres.",
  },
  {
    id: "discover",
    icon: Compass,
    title: "Découvrir des profils",
    description:
      "Parcourez les profils actifs, likez ceux qui vous intéressent ou passez au suivant. Pas de chat libre entre membres — seulement des likes.",
    href: "/decouvrir",
    hrefLabel: "Aller à Découvrir",
  },
  {
    id: "rencontres",
    icon: Layers,
    title: "Rencontres du jour",
    description:
      "Chaque jour, des suggestions ciblées selon vos préférences et votre localisation. Complétez votre profil pour de meilleures recommandations.",
    href: "/rencontres",
    hrefLabel: "Voir Rencontres",
  },
  {
    id: "likes",
    icon: Heart,
    title: "Mes likes",
    description:
      "Retrouvez ici tous les profils que vous avez likés. Si la personne vous like aussi, l'équipe peut analyser une mise en relation.",
    href: "/decouvrir/likes",
    hrefLabel: "Mes likes envoyés",
  },
  {
    id: "match",
    icon: Sparkles,
    title: "Votre match encadré",
    description:
      "Quand nous validons une compatibilité, vous recevez une notification. Vous payez les frais de matching uniquement à ce moment-là.",
    href: "/matchs",
    hrefLabel: "Mon match",
  },
  {
    id: "messages",
    icon: MessageSquare,
    title: "Discussions accompagnées",
    description:
      "Après un match accepté, une conversation s'ouvre avec l'autre membre et notre équipe. Respectueux, encadré, sans harcèlement.",
    href: "/messages",
    hrefLabel: "Messages",
  },
  {
    id: "support",
    icon: Headphones,
    title: "Une équipe à votre écoute",
    description:
      "Questions, signalement ou demande d'accès gratuit : contactez-nous gratuitement à tout moment depuis Contact admin.",
    href: "/contact",
    hrefLabel: "Contacter l'équipe",
  },
];

interface MemberWelcomeTourProps {
  eligible: boolean;
}

export function MemberWelcomeTour({ eligible }: MemberWelcomeTourProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceWelcome = searchParams.get("welcome") === "1";

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const shouldOffer =
    eligible &&
    pathname.startsWith("/decouvrir") &&
    !pathname.startsWith("/decouvrir/likes");

  useEffect(() => {
    if (!shouldOffer) return;
    if (forceWelcome || !isMemberTourCompleted()) {
      const timer = window.setTimeout(() => setOpen(true), 450);
      return () => window.clearTimeout(timer);
    }
  }, [shouldOffer, forceWelcome]);

  const close = useCallback(
    (completed: boolean) => {
      if (completed) markMemberTourCompleted();
      setOpen(false);
      if (forceWelcome) {
        router.replace("/decouvrir", { scroll: false });
      }
    },
    [forceWelcome, router]
  );

  if (!open) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const Icon = current.icon;

  return (
    <div
      className="mm-tour-backdrop fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="member-tour-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fermer"
        onClick={() => close(false)}
      />

      <div className="mm-tour-panel relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-white/20 bg-white shadow-[0_24px_80px_rgba(46,26,71,0.35)]">
        <div className="h-1.5 bg-gradient-to-r from-[#7b3d8f] via-[#e91e8c] to-[#f9a8d4]" />

        <div className="flex items-center justify-between px-5 pt-4 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Visite guidée · {step + 1}/{TOUR_STEPS.length}
          </p>
          <button
            type="button"
            onClick={() => close(false)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
            aria-label="Fermer la visite"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <StepTransition stepKey={current.id}>
          <div className="px-5 pb-2 pt-3 sm:px-6 sm:pt-4">
            <div className="mm-motion-float-slow mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ede9fe] to-[#fce7f3] text-[#7b3d8f]">
              <Icon className="h-8 w-8 stroke-[1.5]" />
            </div>
            <h2
              id="member-tour-title"
              className="mt-5 text-center font-sans text-xl font-bold text-primary sm:text-2xl"
            >
              {current.title}
            </h2>
            <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground sm:text-base">
              {current.description}
            </p>
            {current.tip && (
              <p className="mt-3 text-center text-xs text-secondary">{current.tip}</p>
            )}
          </div>
        </StepTransition>

        <div className="flex justify-center gap-1.5 px-5 py-4">
          {TOUR_STEPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Étape ${i + 1}`}
              onClick={() => setStep(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === step
                  ? "w-6 bg-secondary"
                  : "w-2 bg-muted-foreground/25 hover:bg-muted-foreground/40"
              )}
            />
          ))}
        </div>

        <div className="flex flex-col gap-2 border-t border-border/50 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full"
              disabled={step === 0}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Précédent
            </Button>
            {!isLast && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground"
                onClick={() => close(true)}
              >
                Passer
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 sm:justify-end">
            {current.href && current.hrefLabel && (
              <Button variant="outline" size="sm" className="rounded-full" asChild>
                <Link href={current.href} onClick={() => close(true)}>
                  {current.hrefLabel}
                </Link>
              </Button>
            )}
            {isLast ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => close(true)}
              >
                Commencer à explorer
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-full"
                onClick={() => setStep((s) => s + 1)}
              >
                Suivant
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
