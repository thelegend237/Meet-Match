"use client";

import Link from "next/link";
import {
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Gift,
  Heart,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn, formatCurrency } from "@/lib/utils";
import {
  currencyRegionLabel,
  getMatchingFee,
  getRegistrationFee,
  MATCHING_BENEFITS,
  MATCHING_FEATURES,
  REGISTRATION_BENEFITS,
  REGISTRATION_FEATURES,
} from "@/lib/pricing";
import { RegistrationPaymentButton } from "@/components/user/registration-payment-button";
import type { Payment, Profile } from "@/lib/types/database";

const STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "success" | "warning" }
> = {
  unpaid: { label: "En attente", variant: "warning" },
  paid: { label: "Payé", variant: "success" },
  free: { label: "Gratuit", variant: "secondary" },
  failed: { label: "Échoué", variant: "warning" },
  refunded: { label: "Remboursé", variant: "default" },
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  registration: "Frais d'inscription",
  matching: "Frais de matching",
};

interface PaymentsViewProps {
  profile: Profile;
  payments: Payment[];
}

function FeatureRow({ children }: { children: string }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-foreground/90">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary/15">
        <Check className="h-3 w-3 text-secondary" strokeWidth={3} />
      </span>
      {children}
    </li>
  );
}

function PlanCard({
  title,
  subtitle,
  amount,
  currency,
  regionLabel,
  features,
  benefits,
  highlighted,
  badge,
  footer,
  statusSlot,
}: {
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  regionLabel: string;
  features: readonly string[];
  benefits: readonly { title: string; description: string }[];
  highlighted?: boolean;
  badge?: React.ReactNode;
  footer: React.ReactNode;
  statusSlot?: React.ReactNode;
}) {
  return (
    <article
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow",
        highlighted
          ? "border-secondary/40 shadow-md ring-1 ring-secondary/15"
          : "border-border/70"
      )}
    >
      {highlighted && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-secondary via-secondary/80 to-primary/60" />
      )}

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {badge}
            <h2 className="font-serif text-xl font-bold text-primary sm:text-2xl">
              {title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {subtitle}
            </p>
          </div>
          {statusSlot}
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-2">
          <p className="font-serif text-4xl font-bold tracking-tight text-primary">
            {formatCurrency(amount, currency)}
          </p>
          <span className="mb-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            {regionLabel}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Paiement unique · TVA incluse selon votre pays
        </p>

        <ul className="mt-6 space-y-2.5">
          {features.map((f) => (
            <FeatureRow key={f}>{f}</FeatureRow>
          ))}
        </ul>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-xl bg-muted/40 p-3 ring-1 ring-border/40"
            >
              <p className="text-xs font-semibold text-primary">{b.title}</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {b.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto border-t border-border/60 bg-muted/20 px-5 py-4 sm:px-6">
        {footer}
      </div>
    </article>
  );
}

export function PaymentsView({ profile, payments }: PaymentsViewProps) {
  const registrationPaid =
    profile.registration_payment_status === "paid" ||
    profile.registration_payment_status === "free";

  const registrationFree = profile.registration_payment_status === "free";

  const regFee = getRegistrationFee(profile.country_code);
  const matchFee = getMatchingFee(profile.country_code);

  const matchingPayments = payments.filter((p) => p.type === "matching");
  const hasPaidMatching = matchingPayments.some(
    (p) => p.status === "paid" || p.status === "free"
  );

  const steps = [
    { label: "Compte créé", done: true },
    { label: "Inscription payée", done: registrationPaid },
    { label: "Matchs accompagnés", done: hasPaidMatching },
  ];

  return (
    <div className="space-y-8">
      {/* Statut & parcours */}
      <section className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground shadow-lg">
        <div className="relative p-5 sm:p-6">
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-secondary/25 blur-2xl"
            aria-hidden
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-secondary-foreground/90" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/80">
                  Votre parcours
                </span>
              </div>
              <h2 className="mt-2 font-serif text-2xl font-bold sm:text-3xl">
                {registrationPaid
                  ? "Vous êtes prêt à rencontrer"
                  : "Activez votre accès"}
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-primary-foreground/85">
                {registrationPaid
                  ? registrationFree
                    ? "Accès gratuit accordé par l'équipe — profitez de toutes les fonctionnalités de découverte."
                    : "Inscription réglée : explorez les profils, likez et attendez une proposition de match personnalisée."
                  : "Un seul paiement pour débloquer la plateforme. Les frais de matching ne sont dus que lorsqu'un admin vous propose une rencontre."}
              </p>
            </div>
            <Badge
              variant={registrationPaid ? "success" : "warning"}
              className="shrink-0 border-0 bg-white/15 text-white backdrop-blur-sm"
            >
              {registrationPaid
                ? registrationFree
                  ? "Accès gratuit"
                  : "Compte actif"
                : "Activation requise"}
            </Badge>
          </div>

          <ol className="relative mt-6 flex gap-2 sm:gap-4">
            {steps.map((step, i) => (
              <li key={step.label} className="flex min-w-0 flex-1 flex-col items-center">
                <div className="flex w-full items-center">
                  {i > 0 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 rounded-full",
                        steps[i - 1].done ? "bg-secondary" : "bg-white/20"
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2 ring-white/20",
                      step.done
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-white/10 text-white/70"
                    )}
                  >
                    {step.done ? (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    ) : (
                      i + 1
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 rounded-full",
                        step.done ? "bg-secondary" : "bg-white/20"
                      )}
                    />
                  )}
                </div>
                <span className="mt-2 text-center text-[10px] font-medium leading-tight text-primary-foreground/80 sm:text-xs">
                  {step.label}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Avantages rapides */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Users, label: "Profils actifs", sub: "Membres vérifiés" },
          { icon: Heart, label: "Likes illimités", sub: "Sans abonnement" },
          { icon: ShieldCheck, label: "Paiement sécurisé", sub: "Bientôt Stripe" },
          { icon: MessageCircle, label: "Support humain", sub: "Toujours gratuit" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex flex-col items-center rounded-xl border border-border/50 bg-card p-3 text-center shadow-sm sm:p-4"
          >
            <item.icon className="h-5 w-5 text-secondary" />
            <p className="mt-2 text-xs font-semibold text-primary">{item.label}</p>
            <p className="text-[10px] text-muted-foreground">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* Plans tarifaires */}
      <div className="space-y-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-primary sm:text-2xl">
            Nos offres
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Deux étapes transparentes : rejoindre la communauté, puis être mis en
            relation lorsqu&apos;un profil vous correspond vraiment.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <PlanCard
            title="Frais d'inscription"
            subtitle="Accès complet à la plateforme : profil, découverte et likes."
            amount={regFee.amount}
            currency={regFee.currency}
            regionLabel={currencyRegionLabel(regFee.currency)}
            features={REGISTRATION_FEATURES}
            benefits={REGISTRATION_BENEFITS}
            highlighted={!registrationPaid}
            badge={
              !registrationPaid ? (
                <Badge variant="secondary" className="mb-2">
                  Étape 1 · Requis maintenant
                </Badge>
              ) : (
                <Badge variant="success" className="mb-2">
                  Étape 1 · Complétée
                </Badge>
              )
            }
            statusSlot={
              registrationPaid ? (
                <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-green-800 ring-1 ring-green-200/80">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-medium">Actif</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-amber-900 ring-1 ring-amber-200/80">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-medium">En attente</span>
                </div>
              )
            }
            footer={
              registrationPaid ? (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Rendez-vous sur{" "}
                    <Link
                      href="/decouvrir"
                      className="font-medium text-secondary hover:underline"
                    >
                      Découvrir
                    </Link>{" "}
                    pour liker des profils.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/decouvrir">Explorer</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <RegistrationPaymentButton
                    amount={regFee.amount}
                    currency={regFee.currency}
                    className="w-full sm:w-auto"
                  />
                  <p className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Zap className="h-3.5 w-3.5 text-secondary" />
                    Activation immédiate après paiement (mode test pour l&apos;instant).
                  </p>
                </div>
              )
            }
          />

          <PlanCard
            title="Frais de matching"
            subtitle="Uniquement lorsqu'un administrateur vous propose une mise en relation compatible."
            amount={matchFee.amount}
            currency={matchFee.currency}
            regionLabel={currencyRegionLabel(matchFee.currency)}
            features={MATCHING_FEATURES}
            benefits={MATCHING_BENEFITS}
            highlighted={registrationPaid && !hasPaidMatching}
            badge={
              <Badge variant="outline" className="mb-2 border-secondary/30 text-secondary">
                Étape 2 · Sur proposition
              </Badge>
            }
            statusSlot={
              hasPaidMatching ? (
                <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-green-800 ring-1 ring-green-200/80">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-medium">Réglé</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-muted-foreground">
                  <Heart className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-medium">À la demande</span>
                </div>
              )
            }
            footer={
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {registrationPaid
                    ? "Vous serez notifié dès qu'un admin valide un match. Le paiement se fait depuis la page Mes matchs."
                    : "Disponible après activation de votre inscription."}
                </p>
                <Button
                  variant={registrationPaid ? "secondary" : "outline"}
                  size="sm"
                  className="w-full sm:w-auto"
                  disabled={!registrationPaid}
                  asChild={registrationPaid}
                >
                  {registrationPaid ? (
                    <Link href="/matchs">Voir mes matchs</Link>
                  ) : (
                    <span>Activez d&apos;abord votre compte</span>
                  )}
                </Button>
              </div>
            }
          />
        </div>
      </div>

      {/* Infos complémentaires */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex gap-4 rounded-2xl border border-border/60 bg-accent/25 p-5">
          <Gift className="h-8 w-8 shrink-0 text-secondary" />
          <div>
            <h3 className="font-serif font-semibold text-primary">
              Accès gratuit possible
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              L&apos;administration peut offrir l&apos;inscription, le matching ou un
              accès complet selon votre situation.
            </p>
            <Button variant="link" className="mt-2 h-auto p-0 text-secondary" asChild>
              <Link href="/contact">Demander un accès gratuit</Link>
            </Button>
          </div>
        </div>
        <div className="flex gap-4 rounded-2xl border border-border/60 bg-muted/30 p-5">
          <CreditCard className="h-8 w-8 shrink-0 text-secondary" />
          <div>
            <h3 className="font-serif font-semibold text-primary">
              Paiement sécurisé
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              En mode test, le paiement est simulé. L&apos;intégration Stripe arrivera
              prochainement pour les cartes bancaires.
            </p>
          </div>
        </div>
      </div>

      {/* Historique */}
      <section>
        <h2 className="font-serif text-xl font-bold text-primary">
          Historique des paiements
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Toutes vos transactions enregistrées sur Meet & Match.
        </p>

        {payments.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-border/80 bg-muted/15 px-6 py-12 text-center">
            <CreditCard className="h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 font-medium text-primary">Aucun paiement pour le moment</p>
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Vos frais d&apos;inscription et de matching apparaîtront ici une fois
              enregistrés.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {payments.map((p) => {
              const st = STATUS_LABELS[p.status] ?? STATUS_LABELS.unpaid;
              const isRegistration = p.type === "registration";
              return (
                <li
                  key={p.id}
                  className="flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-secondary/20 hover:bg-muted/20"
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      isRegistration
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary/10 text-secondary"
                    )}
                  >
                    {isRegistration ? (
                      <Zap className="h-5 w-5" />
                    ) : (
                      <Heart className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-primary">
                      {PAYMENT_TYPE_LABELS[p.type] ?? p.type}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums text-primary">
                      {formatCurrency(Number(p.amount), p.currency)}
                    </p>
                    <Badge variant={st.variant} className="mt-1">
                      {st.label}
                    </Badge>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
