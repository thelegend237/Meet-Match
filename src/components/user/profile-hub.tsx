"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  ChevronRight,
  Gauge,
  Heart,
  Lock,
  Mail,
  Pencil,
  Settings,
  Shield,
  Sparkles,
  UserPlus,
  Zap,
  Check,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileAvatarRing } from "@/components/user/profile-avatar-ring";
import { RegistrationPaymentButton } from "@/components/user/registration-payment-button";
import {
  getMatchingFee,
  getRegistrationFee,
  PLAN_COMPARISON_ROWS,
} from "@/lib/pricing";
import { RELATIONSHIP_LABELS } from "@/lib/validations/profile";
import { isProfileOnline } from "@/lib/discover/profile-status";
import { cn, formatCurrency, getAge } from "@/lib/utils";
import type { Payment, Profile } from "@/lib/types/database";

type TabId = "subscriptions" | "security";

interface ProfileHubProps {
  profile: Profile;
  payments: Payment[];
  matchCount?: number;
}

function getActivityLevel(lastSeenAt: string | null): {
  label: string;
  tone: "high" | "medium" | "low";
} {
  if (!lastSeenAt) return { label: "Faible", tone: "low" };
  const days =
    (Date.now() - new Date(lastSeenAt).getTime()) / (1000 * 60 * 60 * 24);
  if (days <= 3) return { label: "Élevée", tone: "high" };
  if (days <= 14) return { label: "Moyenne", tone: "medium" };
  return { label: "Faible", tone: "low" };
}

function activityToneClass(tone: "high" | "medium" | "low") {
  switch (tone) {
    case "high":
      return "text-green-600";
    case "medium":
      return "text-amber-600";
    default:
      return "text-red-500";
  }
}

function PlanCheck({ active, muted }: { active: boolean; muted?: boolean }) {
  if (!active) {
    return <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />;
  }
  return (
    <Check
      className={cn(
        "mx-auto h-4 w-4",
        muted ? "text-muted-foreground" : "text-primary"
      )}
      strokeWidth={3}
    />
  );
}

function ComparisonRow({
  icon: Icon,
  label,
  registration,
  matching,
}: {
  icon: LucideIcon;
  label: string;
  registration: boolean;
  matching: boolean;
}) {
  return (
    <li className="grid grid-cols-[1fr_3.25rem_3.25rem] items-center gap-2 border-b border-border/40 py-3.5 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted/60">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </span>
        <span className="text-sm leading-snug text-foreground">{label}</span>
      </div>
      <PlanCheck active={registration} />
      <PlanCheck active={matching} muted />
    </li>
  );
}

const ROW_ICONS: LucideIcon[] = [
  UserPlus,
  Heart,
  Sparkles,
  Mail,
  Zap,
  Gauge,
  Heart,
  Shield,
];

export function ProfileHub({
  profile,
  payments,
  matchCount = 0,
}: ProfileHubProps) {
  const [tab, setTab] = useState<TabId>("subscriptions");

  const age = getAge(profile.date_of_birth);
  const online = isProfileOnline(profile.last_seen_at);
  const activity = online
    ? { label: "En ligne", tone: "high" as const }
    : getActivityLevel(profile.last_seen_at);

  const registrationPaid =
    profile.registration_payment_status === "paid" ||
    profile.registration_payment_status === "free";
  const registrationFree = profile.registration_payment_status === "free";

  const hasPaidMatching = payments.some(
    (p) =>
      p.type === "matching" && (p.status === "paid" || p.status === "free")
  );

  const regFee = getRegistrationFee(profile.country_code);
  const matchFee = getMatchingFee(profile.country_code);

  const relationshipLabel = profile.relationship_type
    ? RELATIONSHIP_LABELS[profile.relationship_type]
    : null;

  return (
    <div className="-mx-4 -mt-4 min-h-[calc(100dvh-4.75rem)] bg-gradient-to-b from-accent/50 via-accent/20 to-background pb-6 sm:-mx-6 sm:-mt-6 md:min-h-0 md:rounded-2xl">
      <div className="mx-auto max-w-lg bg-card shadow-sm md:rounded-2xl md:border md:border-border/60">
        {/* En-tête */}
        <header className="flex items-center justify-between px-4 pb-2 pt-4">
          <h1 className="text-xl font-bold tracking-tight text-primary">
            Profil
          </h1>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              asChild
            >
              <Link href="/profil/parametres" aria-label="Paramètres">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full"
              asChild
            >
              <Link href="/profil/modifier" aria-label="Modifier le profil">
                <Pencil className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </header>

        {/* Identité */}
        <section className="flex items-start gap-4 px-4 pb-4">
          <ProfileAvatarRing
            photoUrl={profile.primary_photo_url}
            displayName={profile.display_name}
            completion={profile.profile_completion}
          />
          <div className="min-w-0 flex-1 pt-1">
            <h2 className="truncate text-xl font-bold text-primary">
              {profile.display_name || "Mon profil"}
              {age !== null && (
                <span className="font-semibold text-primary/90">, {age}</span>
              )}
            </h2>
            {relationshipLabel && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Heart className="h-3.5 w-3.5 text-secondary" />
                {relationshipLabel}
              </span>
            )}
            {profile.is_verified && (
              <span className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-600">
                <BadgeCheck className="h-4 w-4" />
                Profil vérifié
              </span>
            )}
          </div>
        </section>

        {/* Bannières */}
        <div className="space-y-2 px-4 pb-4">
          {!profile.is_verified && (
            <Link
              href={
                profile.profile_completion < 100
                  ? "/onboarding"
                  : "/contact"
              }
              className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card px-4 py-3.5 shadow-sm transition-colors hover:bg-muted/30"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                <BadgeCheck className="h-5 w-5 text-blue-600" />
              </span>
              <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-primary">
                Complétez votre profil pour être vérifié par l&apos;équipe
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          )}

          {profile.profile_completion < 100 && (
            <Link
              href="/onboarding"
              className="flex items-center gap-3 rounded-2xl border border-secondary/20 bg-secondary/5 px-4 py-3.5 transition-colors hover:bg-secondary/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/15">
                <Sparkles className="h-5 w-5 text-secondary" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-primary">
                  Profil à {profile.profile_completion}% — continuez
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Quelques infos en plus pour de meilleurs matchs
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </Link>
          )}
        </div>

        {/* Onglets */}
        <div
          role="tablist"
          className="flex border-b border-border/60 px-4"
          aria-label="Sections du profil"
        >
          {(
            [
              { id: "subscriptions" as const, label: "Abonnements" },
              { id: "security" as const, label: "Sécurité" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id ? "true" : "false"}
              aria-controls={`profile-tab-${t.id}`}
              id={`profile-tab-btn-${t.id}`}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex-1 py-3 text-sm font-semibold transition-colors",
                tab === t.id
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary/80"
              )}
            >
              {t.label}
              {tab === t.id && (
                <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Stats rapides */}
        <div className="grid grid-cols-2 gap-3 px-4 py-4">
          <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 text-center">
            <Gauge className="mx-auto h-6 w-6 text-muted-foreground" />
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              Activité
            </p>
            <p
              className={cn(
                "mt-0.5 text-sm font-bold",
                activityToneClass(activity.tone)
              )}
            >
              {activity.label}
            </p>
          </div>
          <Link
            href="/paiements"
            className="rounded-2xl border border-border/50 bg-muted/20 p-4 text-center transition-colors hover:bg-muted/40"
          >
            <Zap className="mx-auto h-6 w-6 text-secondary" />
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              Compte
            </p>
            <p
              className={cn(
                "mt-0.5 text-sm font-bold",
                registrationPaid ? "text-green-600" : "text-red-500"
              )}
            >
              {registrationPaid
                ? registrationFree
                  ? "Gratuit"
                  : "Actif"
                : "À activer"}
            </p>
            {!registrationPaid && (
              <span className="mt-1 inline-block text-xs font-medium text-secondary underline-offset-2 hover:underline">
                Activer
              </span>
            )}
          </Link>
        </div>

        {/* Contenu onglets */}
        <div
          className="px-4 pb-6"
          role="tabpanel"
          id={`profile-tab-${tab}`}
          aria-labelledby={`profile-tab-btn-${tab}`}
        >
          {tab === "subscriptions" && (
            <div className="space-y-5">
              {/* Carte upsell */}
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-accent via-accent/80 to-secondary/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary/70">
                  Meet & Match
                </p>
                <h3 className="mt-1 font-serif text-xl font-bold text-primary">
                  {registrationPaid
                    ? "Rencontres accompagnées"
                    : "Activez votre accès"}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-primary/80">
                  {registrationPaid
                    ? "Likes illimités et découverte. Les frais de matching ne sont dus que lorsqu'un admin vous propose une rencontre compatible."
                    : "Rejoignez la communauté, explorez les profils et envoyez des likes — un seul paiement d'inscription."}
                </p>
                <div className="mt-4">
                  {registrationPaid ? (
                    <Button
                      className="h-11 w-full rounded-full bg-primary font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
                      asChild
                    >
                      <Link href="/paiements">
                        {hasPaidMatching
                          ? "Voir mon historique de paiements"
                          : `Matching accompagné · ${formatCurrency(matchFee.amount, matchFee.currency)}`}
                      </Link>
                    </Button>
                  ) : (
                    <RegistrationPaymentButton
                      amount={regFee.amount}
                      currency={regFee.currency}
                      className="h-11 w-full rounded-full font-semibold shadow-md"
                    />
                  )}
                </div>
                <p className="mt-3 text-center text-[10px] text-muted-foreground">
                  Paiement unique · tarif selon votre pays
                </p>
              </div>

              {/* Mini résumé parcours */}
              <div className="flex gap-3 rounded-xl border border-border/40 bg-muted/15 p-3 text-xs">
                <div className="flex-1 text-center">
                  <p className="font-semibold text-primary">{matchCount}</p>
                  <p className="text-muted-foreground">Matchs</p>
                </div>
                <div className="w-px bg-border/60" />
                <div className="flex-1 text-center">
                  <p className="font-semibold text-primary">
                    {payments.length}
                  </p>
                  <p className="text-muted-foreground">Paiements</p>
                </div>
                <div className="w-px bg-border/60" />
                <div className="flex-1 text-center">
                  <p
                    className={cn(
                      "font-semibold",
                      hasPaidMatching ? "text-green-600" : "text-muted-foreground"
                    )}
                  >
                    {hasPaidMatching ? "Oui" : "—"}
                  </p>
                  <p className="text-muted-foreground">Matching payé</p>
                </div>
              </div>

              {/* Tableau avantages */}
              <div>
                <div className="grid grid-cols-[1fr_3.25rem_3.25rem] gap-2 px-1 pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="text-left">Les avantages</span>
                  <span>Inscription</span>
                  <span>Matching</span>
                </div>
                <ul className="rounded-2xl border border-border/50 bg-card px-3">
                  {PLAN_COMPARISON_ROWS.map((row, i) => (
                    <ComparisonRow
                      key={row.label}
                      icon={ROW_ICONS[i] ?? Sparkles}
                      label={row.label}
                      registration={row.registration}
                      matching={row.matching}
                    />
                  ))}
                </ul>
                <Button
                  variant="link"
                  className="mt-3 h-auto w-full p-0 text-secondary"
                  asChild
                >
                  <Link href="/paiements">Tout voir sur la page Paiements →</Link>
                </Button>
              </div>
            </div>
          )}

          {tab === "security" && (
            <div className="space-y-3">
              <Link
                href="/profil/parametres"
                className="flex items-center gap-3 rounded-2xl border border-border/50 px-4 py-3.5 transition-colors hover:bg-muted/30"
              >
                <Lock className="h-5 w-5 text-secondary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-primary">
                    Mot de passe
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Modifier votre mot de passe
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>

              <div className="flex items-center gap-3 rounded-2xl border border-border/50 px-4 py-3.5">
                <Mail className="h-5 w-5 text-secondary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-primary">Email</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {profile.email}
                  </p>
                </div>
              </div>

              <Link
                href="/profil/modifier"
                className="flex items-center gap-3 rounded-2xl border border-border/50 px-4 py-3.5 transition-colors hover:bg-muted/30"
              >
                <Pencil className="h-5 w-5 text-secondary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-primary">
                    Données personnelles
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Nom, ville, bio, préférences
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </Link>

              <div className="rounded-2xl bg-muted/25 p-4 text-sm leading-relaxed text-muted-foreground">
                <Shield className="mb-2 h-5 w-5 text-secondary" />
                <p>
                  Vos informations ne sont visibles que par les membres actifs
                  après validation de votre inscription. L&apos;équipe Meet &
                  Match peut suspendre un compte en cas d&apos;usage
                  inapproprié.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" className="h-11" asChild>
                  <Link href="/profil/photos">Mes photos</Link>
                </Button>
                <Button variant="secondary" className="h-11" asChild>
                  <Link href="/profil/modifier">Modifier</Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        {tab === "subscriptions" && (
          <div className="border-t border-border/40 px-4 py-4">
            {profile.bio && (
              <>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  À propos
                </h3>
                <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-foreground/90">
                  {profile.bio}
                </p>
              </>
            )}
            <div className={cn("grid grid-cols-2 gap-2", profile.bio && "mt-4")}>
              <Button variant="outline" className="h-11" asChild>
                <Link href="/profil/photos">Mes photos</Link>
              </Button>
              <Button variant="secondary" className="h-11" asChild>
                <Link href="/profil/modifier">
                  <Pencil className="h-4 w-4" />
                  Modifier
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
