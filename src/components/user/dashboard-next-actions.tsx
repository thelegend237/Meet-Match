import Link from "next/link";
import {
  Camera,
  CreditCard,
  Heart,
  Sparkles,
  FileText,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatTrialEndDate,
  getTrialDaysRemaining,
  isProfileOnTrial,
} from "@/lib/trial";
import { formatDisplayPrice, getRegistrationFee } from "@/lib/pricing";
import { needsRegistrationActivation } from "@/lib/auth/payment-access";
import type { Profile, UserMatch } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type NextAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  label: string;
  icon: typeof Heart;
  priority: number;
  accent?: "urgent" | "default";
};

export function buildDashboardNextActions(params: {
  profile: Profile;
  likesSent: number;
  pendingPaymentMatch: UserMatch | null;
}): NextAction[] {
  const { profile, likesSent, pendingPaymentMatch } = params;
  const actions: NextAction[] = [];
  const onTrial = isProfileOnTrial(profile);
  const days = getTrialDaysRemaining(profile);
  const fee = getRegistrationFee(profile.country_code);

  if (pendingPaymentMatch) {
    actions.push({
      id: "match-pay",
      title: "Confirmer votre match",
      description:
        "Une mise en relation vous attend. Confirmez pour ouvrir la discussion encadrée.",
      href: `/matchs?match=${pendingPaymentMatch.id}`,
      label: "Voir le match",
      icon: Sparkles,
      priority: 0,
      accent: "urgent",
    });
  }

  if (!profile.primary_photo_url) {
    actions.push({
      id: "photo",
      title: "Ajoutez une photo",
      description:
        "Sans photo, votre profil n'apparaît pas en découverte et l'équipe ne peut pas vous matcher.",
      href: "/profil/photos",
      label: "Ajouter une photo",
      icon: Camera,
      priority: 1,
      accent: "urgent",
    });
  }

  if (!profile.bio || profile.bio.trim().length < 20) {
    actions.push({
      id: "bio",
      title: "Rédigez votre bio",
      description:
        "Présentez-vous en quelques lignes pour augmenter vos chances de mise en relation.",
      href: "/profil/modifier",
      label: "Compléter mon profil",
      icon: FileText,
      priority: 2,
    });
  }

  if (likesSent === 0 && (onTrial || !needsRegistrationActivation(profile))) {
    actions.push({
      id: "like",
      title: "Likez un premier profil",
      description:
        "Parcourez Découvrir et montrez votre intérêt — l'équipe analyse ensuite les compatibilités.",
      href: "/decouvrir",
      label: "Découvrir",
      icon: Heart,
      priority: 3,
    });
  }

  if (onTrial && days <= 3) {
    actions.push({
      id: "trial-convert",
      title: days <= 1 ? "Dernier jour d'essai" : `Essai : ${days} jours restants`,
      description: `Activez votre compte (${formatDisplayPrice(fee.amount, fee.currency)}) avant le ${formatTrialEndDate(profile) ?? "…"} pour ne pas perdre l'accès.`,
      href: "/paiements",
      label: "Activer mon compte",
      icon: CreditCard,
      priority: 0.5,
      accent: "urgent",
    });
  } else if (needsRegistrationActivation(profile)) {
    actions.push({
      id: "activate",
      title: "Activez votre compte",
      description: `Pour liker et être mis en relation : ${formatDisplayPrice(fee.amount, fee.currency)}.`,
      href: "/paiements",
      label: "Activer",
      icon: CreditCard,
      priority: 1.5,
      accent: "urgent",
    });
  } else if (onTrial && likesSent > 0) {
    actions.push({
      id: "keep-liking",
      title: "Continuez à liker",
      description: `Essai jusqu'au ${formatTrialEndDate(profile) ?? "…"} — plus vous likez, plus l'équipe peut vous proposer un match.`,
      href: "/decouvrir",
      label: "Continuer",
      icon: Heart,
      priority: 4,
    });
  }

  return actions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);
}

export function DashboardNextActions({
  profile,
  likesSent,
  pendingPaymentMatch,
}: {
  profile: Profile;
  likesSent: number;
  pendingPaymentMatch: UserMatch | null;
}) {
  const actions = buildDashboardNextActions({
    profile,
    likesSent,
    pendingPaymentMatch,
  });

  if (actions.length === 0) return null;

  return (
    <section className="mm-card overflow-hidden p-0">
      <div className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-secondary/5 px-5 py-4 sm:px-6">
        <h2 className="font-sans text-lg font-bold text-primary">
          Prochaines actions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ce qui augmente le plus vos chances aujourd&apos;hui.
        </p>
      </div>
      <ul className="divide-y divide-border/40">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <li
              key={action.id}
              className={cn(
                "flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6",
                action.accent === "urgent" && "bg-amber-50/40"
              )}
            >
              <div className="flex gap-3">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    action.accent === "urgent"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-accent text-secondary"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-primary">{action.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {action.description}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant={action.accent === "urgent" ? "secondary" : "outline"}
                className="shrink-0 rounded-full"
                asChild
              >
                <Link href={action.href}>
                  {action.label}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
