import Link from "next/link";
import { Headphones, Heart, Percent, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatTrialEndDate,
  getTrialDaysRemaining,
  isProfileOnTrial,
} from "@/lib/trial";
import { needsRegistrationActivation } from "@/lib/auth/payment-access";
import type { Profile, UserMatch } from "@/lib/types/database";

export function DashboardDossier({
  profile,
  likesSent,
  matches,
}: {
  profile: Profile;
  likesSent: number;
  matches: UserMatch[];
}) {
  const onTrial = isProfileOnTrial(profile);
  const days = getTrialDaysRemaining(profile);
  const pendingMatches = matches.filter((m) =>
    ["pending", "pending_payment"].includes(m.status)
  ).length;
  const activeMatches = matches.filter((m) => m.status === "active").length;

  let accessLabel = "Compte actif";
  if (onTrial) {
    accessLabel = `Essai — ${days} j. restant${days > 1 ? "s" : ""}`;
  } else if (needsRegistrationActivation(profile)) {
    accessLabel = "Activation requise";
  } else if (profile.registration_payment_status === "free") {
    accessLabel = "Accès gratuit";
  }

  return (
    <section className="mm-card p-5 sm:p-6">
      <h2 className="font-sans text-lg font-bold text-primary">Votre dossier</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        L&apos;équipe analyse vos likes pour proposer une mise en relation
        encadrée. Aucun délai garanti — plus votre profil est complet, plus
        c&apos;est efficace.
      </p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-muted/40 px-4 py-3">
          <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Percent className="h-3.5 w-3.5" />
            Profil
          </dt>
          <dd className="mt-1 text-lg font-bold text-primary">
            {profile.profile_completion ?? 0}%
          </dd>
        </div>
        <div className="rounded-xl bg-muted/40 px-4 py-3">
          <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Heart className="h-3.5 w-3.5" />
            Likes envoyés
          </dt>
          <dd className="mt-1 text-lg font-bold text-primary">{likesSent}</dd>
        </div>
        <div className="rounded-xl bg-muted/40 px-4 py-3">
          <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Matchs
          </dt>
          <dd className="mt-1 text-lg font-bold text-primary">
            {activeMatches > 0
              ? `${activeMatches} actif${activeMatches > 1 ? "s" : ""}`
              : pendingMatches > 0
                ? `${pendingMatches} en attente`
                : "Aucun pour l'instant"}
          </dd>
        </div>
        <div className="rounded-xl bg-muted/40 px-4 py-3">
          <dt className="text-xs font-medium text-muted-foreground">Accès</dt>
          <dd className="mt-1 text-lg font-bold text-primary">{accessLabel}</dd>
          {onTrial && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Jusqu&apos;au {formatTrialEndDate(profile) ?? "…"}
            </p>
          )}
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="rounded-full" asChild>
          <Link href="/decouvrir/likes">Mes likes</Link>
        </Button>
        <Button variant="outline" size="sm" className="rounded-full" asChild>
          <Link href="/contact">
            <Headphones className="mr-1.5 h-4 w-4" />
            Contacter l&apos;équipe
          </Link>
        </Button>
      </div>
    </section>
  );
}
