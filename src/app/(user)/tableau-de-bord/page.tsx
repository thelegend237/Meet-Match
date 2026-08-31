import Link from "next/link";
import { Suspense } from "react";
import {
  CreditCard,
  Heart,
  MessageSquare,
  Shield,
  Headphones,
} from "lucide-react";
import { requireUser, hasPlatformAccess, isDeactivatedAfterMatchSuccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { userIsLockedAfterMatchSuccess } from "@/lib/matches/exclusions";
import { getUserMatches } from "@/lib/user/matches";
import { getMyLikedIds } from "@/lib/actions/likes";
import { DashboardNotificationsPreview } from "@/components/user/dashboard-notifications-preview";
import { DashboardNextActions } from "@/components/user/dashboard-next-actions";
import { DashboardDossier } from "@/components/user/dashboard-dossier";
import { TrialBanner } from "@/components/user/trial-banner";
import { ReactivationBanner } from "@/components/user/reactivation-banner";
import {
  ProfileCompletionBanner,
  PaymentRequiredBanner,
} from "@/components/user/profile-banners";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/page-header";
import { AnimatedPageStack } from "@/components/layout/animated-page-stack";
import { DashboardNotificationsSkeleton } from "@/components/layout/page-loading-skeletons";
import {
  getTrialDaysRemaining,
  isProfileOnTrial,
} from "@/lib/trial";

export const metadata = {
  title: "Tableau de bord",
};

export default async function DashboardPage() {
  const profile = await requireUser();
  const [matches, likedIds] = await Promise.all([
    getUserMatches(profile.id),
    getMyLikedIds(profile.id),
  ]);
  const activeMatch = matches.find(
    (m) => m.status === "active" || m.status === "pending_payment"
  );
  const pendingPaymentMatch =
    matches.find(
      (m) =>
        m.status === "pending_payment" && m.myPayment?.status === "unpaid"
    ) ?? null;
  const completion = profile.profile_completion ?? 0;
  const onTrial = isProfileOnTrial(profile);
  const trialDays = getTrialDaysRemaining(profile);
  const deactivatedAfterMatch =
    isDeactivatedAfterMatchSuccess(profile) ||
    (profile.role === "user" &&
      (await userIsLockedAfterMatchSuccess(
        await createClient(),
        profile.id
      )));

  if (deactivatedAfterMatch) {
    return (
      <AnimatedPageStack>
        <PageHeader
          title={`Bonjour ${profile.display_name?.split(" ")[0] ?? "membre"} 👋`}
          description="Votre compte est en pause après une mise en relation réussie."
        />
        <ReactivationBanner />
        <div className="mm-card flex flex-col items-center justify-center p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100">
            <Heart className="h-8 w-8 text-violet-700" />
          </div>
          <h2 className="mt-4 font-sans text-lg font-bold text-primary">
            Profil en pause
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Vous conservez l&apos;accès à votre tableau de bord, votre profil et
            le contact avec l&apos;équipe. Pour revenir sur la plateforme,
            demandez une réactivation.
          </p>
          <Button variant="secondary" className="mt-6 rounded-full" asChild>
            <Link href="/contact?subject=reactivation">
              <MessageSquare className="h-4 w-4" />
              Contacter l&apos;admin
            </Link>
          </Button>
        </div>
      </AnimatedPageStack>
    );
  }

  return (
    <AnimatedPageStack>
      <PageHeader
        title={`Bonjour ${profile.display_name?.split(" ")[0] ?? "membre"} 👋`}
        description="Voici un aperçu de votre activité sur Meet & Match."
      />

      <TrialBanner
        profile={profile}
        variant={onTrial && trialDays <= 3 ? "urgent" : "inline"}
      />
      <ProfileCompletionBanner profile={profile} />
      <PaymentRequiredBanner profile={profile} />

      <DashboardNextActions
        profile={profile}
        likesSent={likedIds.length}
        pendingPaymentMatch={pendingPaymentMatch}
      />

      <DashboardDossier
        profile={profile}
        likesSent={likedIds.length}
        matches={matches}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="mm-card flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <div className="relative mx-auto flex h-28 w-28 shrink-0 items-center justify-center sm:mx-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-muted"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="url(#grad)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${completion * 2.64} 264`}
              />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7b3d8f" />
                  <stop offset="100%" stopColor="#e91e8c" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute font-sans text-2xl font-bold text-primary">
              {completion}%
            </span>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="font-sans text-lg font-bold text-primary">
              Complétion de votre profil
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {completion >= 80
                ? "Votre profil est presque complet !"
                : "Complétez votre profil pour de meilleures suggestions."}
            </p>
            <Progress value={completion} className="mt-4 h-2" />
            <Link
              href="/profil/modifier"
              className="mt-4 inline-flex text-sm font-medium text-secondary hover:underline"
            >
              Compléter mon profil →
            </Link>
          </div>
        </div>

        <div className="mm-card flex flex-col items-center justify-center p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
            <Heart className="h-8 w-8 fill-secondary text-secondary" />
          </div>
          <h2 className="mt-4 font-sans text-lg font-bold text-primary">
            Statut de votre match
          </h2>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            {activeMatch
              ? "Une mise en relation est en cours avec notre équipe."
              : likedIds.length > 0
                ? `${likedIds.length} like${likedIds.length > 1 ? "s" : ""} envoyé${likedIds.length > 1 ? "s" : ""} — l'équipe analyse les compatibilités.`
                : "En attente de proposition — likez des profils pour démarrer."}
          </p>
          <Button variant="secondary" className="mt-6 rounded-full" asChild>
            <Link href={likedIds.length > 0 ? "/matchs" : "/decouvrir"}>
              {likedIds.length > 0 ? "En savoir plus" : "Découvrir"}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Suspense fallback={<DashboardNotificationsSkeleton />}>
          <DashboardNotificationsPreview userId={profile.id} />
        </Suspense>

        <div className="mm-card flex flex-col justify-between bg-gradient-to-br from-accent/80 to-secondary/5 p-6">
          <div>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 shadow-sm">
              <Headphones className="h-7 w-7 text-secondary" />
            </div>
            <h2 className="mt-4 font-sans text-lg font-bold text-primary">
              Besoin d&apos;aide ?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Notre équipe est là pour vous accompagner à chaque étape.
            </p>
          </div>
          <Button variant="gradient" className="mt-6 w-full rounded-full" asChild>
            <Link href="/contact">
              <MessageSquare className="h-4 w-4" />
              Contacter l&apos;admin
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/10 bg-primary/5 px-5 py-4 text-sm text-muted-foreground">
        <Shield className="h-5 w-5 shrink-0 text-primary" />
        <span className="flex-1">
          Vos données sont 100% sécurisées et confidentielles.
        </span>
        {!hasPlatformAccess(profile) && (
          <Button size="sm" variant="secondary" className="rounded-full" asChild>
            <Link href="/paiements">
              <CreditCard className="h-4 w-4" />
              Activer
            </Link>
          </Button>
        )}
      </div>
    </AnimatedPageStack>
  );
}
