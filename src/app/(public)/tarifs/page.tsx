import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CreditCard,
  Gift,
  Heart,
  MessageCircle,
  Sparkles,
  X,
} from "lucide-react";
import { PublicPage } from "@/components/layout/public-page";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  getMatchingFee,
  getRegistrationFee,
  MATCHING_BENEFITS,
  MATCHING_FEATURES,
  PLAN_COMPARISON_ROWS,
  REGISTRATION_BENEFITS,
  REGISTRATION_FEATURES,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Frais d'inscription et de matching Meet & Match. Contact administrateur gratuit. Accès gratuit possible sur décision de l'administration.",
};

const regFee = getRegistrationFee(null);
const matchFee = getMatchingFee(null);

const pricingPlans = [
  {
    id: "registration",
    title: "Frais d'inscription",
    badge: "Étape 1",
    amount: regFee.amount,
    currency: regFee.currency,
    description:
      "Parcourez les profils gratuitement dès l'inscription. Activez votre compte pour liker et interagir avec les membres.",
    features: [...REGISTRATION_FEATURES],
    extra: "Contact administrateur gratuit",
    cta: "S'inscrire",
    href: "/inscription",
    highlighted: false,
    accent: "pink" as const,
  },
  {
    id: "matching",
    title: "Frais de matching",
    badge: "Sur invitation",
    amount: matchFee.amount,
    currency: matchFee.currency,
    description:
      "Proposé uniquement lorsqu'un administrateur vous suggère une mise en relation compatible.",
    features: [...MATCHING_FEATURES],
    extra: null,
    cta: "Créer mon compte",
    href: "/inscription",
    highlighted: true,
    accent: "purple" as const,
  },
];

const paymentSteps = [
  {
    step: "01",
    title: "Inscription",
    text: "Créez votre profil et parcourez gratuitement les membres actifs.",
  },
  {
    step: "02",
    title: "Activation",
    text: "Activez votre compte pour envoyer des likes ; l'équipe étudie les compatibilités.",
  },
  {
    step: "03",
    title: "Match proposé",
    text: "Un admin vous propose une mise en relation — les frais de matching s'appliquent alors.",
  },
  {
    step: "04",
    title: "Discussion",
    text: "Après paiement des deux côtés, la conversation encadrée s'ouvre.",
  },
] as const;

export default function TarifsPage() {
  return (
    <PublicPage
      variant="landing"
      eyebrow="Tarifs transparents"
      title="Nos tarifs"
      description="Deux paiements clairs, sans surprise : l'inscription pour rejoindre la plateforme, le matching uniquement quand un administrateur vous propose une rencontre."
      wide
    >
      <div className="mm-landing-panel mb-10 overflow-hidden">
        <div className="flex flex-col gap-4 bg-gradient-to-br from-[#fce7f3]/40 via-white to-[#ede9fe]/30 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          <div className="mm-landing-icon-purple h-14 w-14 shrink-0">
            <CreditCard className="h-6 w-6 stroke-[1.75]" />
          </div>
          <div>
            <p className="font-sans text-lg font-bold text-[#2e1a47] sm:text-xl">
              Pas de frais cachés
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#6b5f7a] sm:text-base">
              Le matching n&apos;est <strong className="font-semibold text-[#2e1a47]">jamais</strong>{" "}
              facturé à l&apos;avance. Vous ne payez les frais de matching que
              lorsqu&apos;un administrateur vous propose une mise en relation
              compatible.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        {pricingPlans.map((plan) => (
          <article
            key={plan.id}
            className={cn(
              "relative overflow-hidden rounded-2xl border bg-white",
              plan.highlighted
                ? "border-[#f0c4dc]/80 shadow-[0_16px_48px_rgba(233,30,140,0.12)] ring-2 ring-[#f0c4dc]/50"
                : "mm-landing-card border-[#ebe6f0]/80"
            )}
          >
            <div
              className={cn(
                "h-1.5 w-full",
                plan.accent === "pink"
                  ? "bg-gradient-to-r from-[#e91e8c] to-[#f9a8d4]"
                  : "bg-gradient-to-r from-[#7b3d8f] to-[#e91e8c]"
              )}
            />

            {plan.highlighted && (
              <div className="absolute right-4 top-5 flex items-center gap-1 rounded-full bg-[#fce7f3] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#be185d]">
                <Sparkles className="h-3 w-3" />
                Recommandé
              </div>
            )}

            <div className="p-6 sm:p-8">
              <span className="mm-landing-eyebrow text-[10px]">{plan.badge}</span>
              <h2 className="mt-2 font-sans text-xl font-bold text-[#2e1a47] sm:text-2xl">
                {plan.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#6b5f7a]">
                {plan.description}
              </p>

              <div className="mt-6 flex items-baseline gap-2">
                <p className="font-sans text-4xl font-bold text-[#2e1a47] sm:text-[2.75rem]">
                  {formatCurrency(plan.amount, plan.currency)}
                </p>
                <span className="text-sm text-[#9b8fa8]">paiement unique</span>
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-sm text-[#2e1a47]/90"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#fce7f3]">
                      <Check className="h-3 w-3 text-[#e91e8c]" strokeWidth={3} />
                    </span>
                    {feature}
                  </li>
                ))}
                {plan.extra && (
                  <li className="flex items-start gap-2.5 text-sm font-medium text-[#2e1a47]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ede9fe]">
                      <MessageCircle className="h-3 w-3 text-[#7b3d8f]" />
                    </span>
                    {plan.extra}
                  </li>
                )}
              </ul>

              <Button
                variant={plan.highlighted ? "secondary" : "outline"}
                className={cn(
                  "mt-8 w-full rounded-full",
                  !plan.highlighted && "mm-landing-btn-outline"
                )}
                asChild
              >
                <Link href={plan.href}>
                  {plan.cta}
                  {plan.highlighted && <ArrowRight className="h-4 w-4" />}
                </Link>
              </Button>
            </div>
          </article>
        ))}
      </div>

      <section className="mt-12">
        <h2 className="mm-landing-title text-center text-2xl sm:text-3xl">
          Quand payer quoi ?
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#6b5f7a] sm:text-base">
          Un parcours linéaire — vous savez toujours à quelle étape intervient
          chaque frais.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {paymentSteps.map((item, index) => (
            <article key={item.step} className="mm-landing-card p-5">
              <span className="font-sans text-2xl font-bold text-[#2e1a47]/15">
                {item.step}
              </span>
              <div
                className={cn(
                  "mt-2 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md",
                  index % 2 === 0
                    ? "bg-[#e91e8c] shadow-[#e91e8c]/25"
                    : "bg-[#7b3d8f] shadow-[#7b3d8f]/25"
                )}
              >
                {index === 0 && <CreditCard className="h-5 w-5" />}
                {index === 1 && <Heart className="h-5 w-5" />}
                {index === 2 && <Sparkles className="h-5 w-5" />}
                {index === 3 && <MessageCircle className="h-5 w-5" />}
              </div>
              <h3 className="mt-3 font-sans text-base font-bold text-[#2e1a47]">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#6b5f7a]">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-12 overflow-hidden rounded-2xl border border-[#ebe6f0]/80 bg-white shadow-[0_8px_32px_rgba(46,26,71,0.08)]">
        <div className="border-b border-[#ebe6f0]/80 bg-[#faf8fc] px-5 py-4 sm:px-6">
          <h2 className="font-sans text-lg font-bold text-[#2e1a47] sm:text-xl">
            Comparatif des formules
          </h2>
          <p className="mt-1 text-sm text-[#6b5f7a]">
            Ce qui est inclus dans chaque paiement.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-[#ebe6f0]/80 text-left">
                <th className="px-5 py-3.5 font-medium text-[#9b8fa8] sm:px-6">
                  Fonctionnalité
                </th>
                <th className="px-4 py-3.5 text-center font-semibold text-[#2e1a47]">
                  Inscription
                </th>
                <th className="px-4 py-3.5 text-center font-semibold text-[#e91e8c]">
                  Matching
                </th>
              </tr>
            </thead>
            <tbody>
              {PLAN_COMPARISON_ROWS.map((row) => (
                <tr
                  key={row.label}
                  className="border-b border-[#ebe6f0]/50 last:border-0"
                >
                  <td className="px-5 py-3.5 text-[#2e1a47] sm:px-6">{row.label}</td>
                  <td className="px-4 py-3.5 text-center">
                    {row.registration ? (
                      <Check className="mx-auto h-4 w-4 text-emerald-600" />
                    ) : (
                      <X className="mx-auto h-4 w-4 text-[#d8cfe8]" />
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {row.matching ? (
                      <Check className="mx-auto h-4 w-4 text-emerald-600" />
                    ) : (
                      <X className="mx-auto h-4 w-4 text-[#d8cfe8]" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...REGISTRATION_BENEFITS, ...MATCHING_BENEFITS].map((benefit, i) => (
          <article key={benefit.title} className="mm-landing-card p-5">
            <div
              className={cn(
                "h-10 w-10",
                i < 3 ? "mm-landing-icon-pink" : "mm-landing-icon-purple"
              )}
            >
              <Check className="h-4 w-4 stroke-[2]" />
            </div>
            <h3 className="mt-3 font-sans text-base font-bold text-[#2e1a47]">
              {benefit.title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-[#6b5f7a]">
              {benefit.description}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="mm-landing-card flex gap-4 p-6">
          <div className="mm-landing-icon-pink h-12 w-12 shrink-0">
            <MessageCircle className="h-5 w-5 stroke-[1.75]" />
          </div>
          <div>
            <h3 className="font-sans text-lg font-semibold text-[#2e1a47]">
              Contact administrateur gratuit
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#6b5f7a]">
              Visiteurs et membres peuvent contacter notre équipe gratuitement à
              tout moment, sans engagement.
            </p>
            <Link
              href="/contact"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#e91e8c] hover:underline"
            >
              Écrire à un administrateur
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="mm-landing-card flex gap-4 p-6">
          <div className="mm-landing-icon-purple h-12 w-12 shrink-0">
            <Gift className="h-5 w-5 stroke-[1.75]" />
          </div>
          <div>
            <h3 className="font-sans text-lg font-semibold text-[#2e1a47]">
              Accès gratuit possible
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#6b5f7a]">
              L&apos;administration peut accorder un accès gratuit à
              l&apos;inscription, au matching ou un accès complet, selon les
              situations.
            </p>
            <Link
              href="/contact?subject=acces-gratuit"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#7b3d8f] hover:underline"
            >
              Demander un accès gratuit
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button
          variant="secondary"
          size="lg"
          className="w-full rounded-full shadow-md shadow-[#e91e8c]/20 sm:w-auto"
          asChild
        >
          <Link href="/inscription">
            Créer mon compte
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="mm-landing-btn-outline w-full sm:w-auto"
          asChild
        >
          <Link href="/fonctionnement">Comment ça marche</Link>
        </Button>
      </div>

      <p className="mt-8 text-center text-sm text-[#9b8fa8]">
        Tarifs affichés en dollars canadiens (CAD). Membres aux États-Unis : tarif
        en USD ({formatCurrency(32, "USD")} inscription,{" "}
        {formatCurrency(55, "USD")} matching).
      </p>
    </PublicPage>
  );
}
