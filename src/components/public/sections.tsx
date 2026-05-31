import Link from "next/link";
import {
  ArrowRight,
  Check,
  Heart,
  MessageCircle,
  Shield,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegisterForm } from "@/components/public/register-form";
import { formatCurrency } from "@/lib/utils";
import { getRegistrationFee, REGISTRATION_FEATURES } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const regFee = getRegistrationFee(null);

function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none">
      <div
        className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-secondary/20 via-transparent to-primary/10 blur-2xl"
        aria-hidden
      />
      <div className="relative space-y-3">
        <div className="ml-auto w-[88%] rounded-2xl border border-border/60 bg-card p-4 shadow-lg shadow-primary/5 ring-1 ring-white/60">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary/30 text-sm font-bold text-primary">
              S.M.
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-primary">Sophie, 32 ans</p>
              <p className="truncate text-xs text-muted-foreground">
                Paris · Recherche sérieuse
              </p>
            </div>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-800">
              Active
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
              Bio complète
            </span>
            <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-[10px] font-medium text-secondary">
              Vérifiée
            </span>
          </div>
        </div>

        <div className="mr-6 rounded-2xl border border-secondary/20 bg-gradient-to-r from-secondary/10 to-accent/50 p-3.5 shadow-md">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 fill-secondary text-secondary" />
            <p className="text-xs font-semibold text-primary">
              Like envoyé — en attente de réciprocité
            </p>
          </div>
        </div>

        <div className="ml-4 rounded-2xl border border-primary/15 bg-primary p-4 text-primary-foreground shadow-xl">
          <div className="flex items-start gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
              <UserCheck className="h-4 w-4 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-foreground/70">
                Proposition Meet & Match
              </p>
              <p className="mt-1 text-sm font-medium leading-snug">
                Match compatible trouvé — discussion encadrée prête à s&apos;ouvrir.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(212,20,90,0.12),transparent)]"
        aria-hidden
      />
      <div
        className="absolute -left-24 top-32 h-64 w-64 rounded-full bg-primary/5 blur-3xl"
        aria-hidden
      />
      <div
        className="absolute -right-16 top-8 h-56 w-56 rounded-full bg-secondary/15 blur-3xl"
        aria-hidden
      />

      <div className="relative px-4 pb-12 pt-6 sm:mx-auto sm:max-w-6xl sm:px-6 sm:pb-20 sm:pt-10 lg:pt-14">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="text-center lg:text-left">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-card/80 px-3 py-1.5 text-xs font-medium text-primary shadow-sm backdrop-blur sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 text-secondary" />
              Rencontres sérieuses · Zéro swipe anonyme
            </div>

            <h1 className="font-serif text-[1.85rem] font-bold leading-[1.15] tracking-tight text-primary sm:text-4xl lg:text-[2.75rem]">
              Trouvez une relation{" "}
              <span className="bg-gradient-to-r from-secondary to-secondary/80 bg-clip-text text-transparent">
                qui a du sens
              </span>
              , accompagnée par des humains.
            </h1>

            <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg lg:max-w-lg">
              Créez votre profil, likez des personnes compatibles, et laissez notre
              équipe vous proposer des matchs validés — sans messagerie libre entre
              inconnus.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button
                variant="secondary"
                size="lg"
                className="h-12 w-full text-base shadow-lg shadow-secondary/25 sm:w-auto"
                asChild
              >
                <Link href="#inscription">
                  <UserPlus className="h-5 w-5" />
                  Essayer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-12 w-full border-primary/20 bg-card/50 text-base sm:w-auto"
                asChild
              >
                <Link href="/fonctionnement">Voir comment ça marche</Link>
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground lg:text-left">
              Inscription à partir de{" "}
              <span className="font-semibold text-primary">
                {formatCurrency(regFee.amount, regFee.currency)}
              </span>{" "}
              · Contact admin gratuit ·{" "}
              <Link href="/tarifs" className="text-secondary hover:underline">
                Voir les tarifs
              </Link>
            </p>

            <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs font-medium text-muted-foreground lg:justify-start">
              {[
                "Profils actifs vérifiés",
                "Likes illimités",
                "Matchs proposés par l'équipe",
              ].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-secondary" strokeWidth={3} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <HeroMockup />
        </div>
      </div>
    </section>
  );
}

export function SocialProofSection() {
  const stats = [
    { value: "100 %", label: "Mises en relation encadrées" },
    { value: "0", label: "Chat libre entre membres" },
    { value: "24/7", label: "Support administrateur" },
  ];

  return (
    <section className="border-y border-border/60 bg-card/50">
      <div className="mx-auto grid max-w-6xl grid-cols-3 divide-x divide-border/60 px-4 sm:px-6">
        {stats.map((stat) => (
          <div key={stat.label} className="px-2 py-6 text-center sm:py-8 sm:px-4">
            <p className="font-serif text-2xl font-bold text-secondary sm:text-3xl">
              {stat.value}
            </p>
            <p className="mt-1 text-[10px] font-medium leading-tight text-muted-foreground sm:text-xs">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function WhySection() {
  const reasons = [
    {
      icon: Shield,
      title: "Sécurité & sérieux",
      description:
        "Chaque échange passe par l'équipe. Fini les messages non sollicités et les profils fantômes.",
    },
    {
      icon: Users,
      title: "Compatibilité humaine",
      description:
        "Nos administrateurs analysent les profils avant de proposer un match, pas un algorithme opaque.",
    },
    {
      icon: Heart,
      title: "Intentions claires",
      description:
        "Des membres qui cherchent une vraie relation, avec bio, attentes et préférences détaillées.",
    },
    {
      icon: Zap,
      title: "Parcours simple",
      description:
        "Profil → likes → proposition de match. Vous savez toujours où vous en êtes.",
    },
  ];

  return (
    <section className="py-14 sm:py-20">
      <div className="px-4 sm:mx-auto sm:max-w-6xl sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-serif text-2xl font-bold text-primary sm:text-3xl lg:text-4xl">
            Pourquoi choisir Meet & Match ?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
            Une alternative aux applications de rencontre classiques, pensée pour
            les personnes qui veulent être accompagnées, pas submergées.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {reasons.map((item) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all hover:border-secondary/30 hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-secondary/15 to-primary/5 text-secondary transition-transform group-hover:scale-105">
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-serif text-lg font-semibold text-primary">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StepsSection() {
  const steps = [
    {
      icon: UserPlus,
      step: "01",
      title: "Créez votre profil",
      description:
        "Photos, bio, attentes : montrez qui vous êtes en quelques minutes.",
    },
    {
      icon: Heart,
      step: "02",
      title: "Likez en confiance",
      description:
        "Découvrez des profils actifs et exprimez votre intérêt — sans pression.",
    },
    {
      icon: MessageCircle,
      step: "03",
      title: "Recevez un vrai match",
      description:
        "Notre équipe valide la compatibilité et ouvre une discussion encadrée.",
    },
  ];

  return (
    <section className="bg-muted/30 py-14 sm:py-20">
      <div className="px-4 sm:mx-auto sm:max-w-6xl sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Simple & transparent
            </p>
            <h2 className="mt-2 font-serif text-2xl font-bold text-primary sm:text-3xl lg:text-4xl">
              Comment ça marche ?
            </h2>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground sm:text-base">
              Trois étapes claires. Pas de chat libre entre utilisateurs — chaque
              rencontre est méritée et accompagnée.
            </p>
          </div>
          <Button variant="outline" className="shrink-0" asChild>
            <Link href="/fonctionnement">
              Détails du parcours
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="relative mt-10 lg:mt-14">
          <div
            className="absolute left-0 right-0 top-12 hidden h-0.5 bg-gradient-to-r from-transparent via-secondary/30 to-transparent lg:block"
            aria-hidden
          />
          <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
            {steps.map((item, index) => (
              <div
                key={item.step}
                className={cn(
                  "relative rounded-2xl border border-border/60 bg-card p-6 shadow-sm",
                  index === 1 && "lg:translate-y-4"
                )}
              >
                <span className="font-serif text-4xl font-bold text-primary/10">
                  {item.step}
                </span>
                <div className="mt-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-md shadow-secondary/25">
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-serif text-xl font-semibold text-primary">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PricingTeaserSection() {
  return (
    <section className="py-14 sm:py-16">
      <div className="px-4 sm:mx-auto sm:max-w-6xl sm:px-6">
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-accent/30 p-6 shadow-lg sm:p-10">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Tarifs transparents
              </p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-primary sm:text-3xl">
                Commencez pour{" "}
                {formatCurrency(regFee.amount, regFee.currency)}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Un paiement unique pour rejoindre la communauté. Les frais de
                matching ne sont dus que lorsqu&apos;un administrateur vous propose
                une rencontre compatible.
              </p>
              <ul className="mt-5 space-y-2">
                {REGISTRATION_FEATURES.slice(0, 4).map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-foreground/90"
                  >
                    <Check className="h-4 w-4 shrink-0 text-secondary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="secondary" className="mt-6" asChild>
                <Link href="/tarifs">
                  Voir tous les tarifs
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="rounded-2xl bg-primary p-6 text-primary-foreground sm:p-8">
              <p className="text-sm text-primary-foreground/80">
                Prêt à tester ?
              </p>
              <p className="mt-2 font-serif text-3xl font-bold">
                Créez votre compte en 2 minutes
              </p>
              <p className="mt-3 text-sm leading-relaxed text-primary-foreground/85">
                Rejoignez des membres sérieux. Notre équipe reste disponible
                gratuitement si vous avez la moindre question.
              </p>
              <Button
                variant="secondary"
                size="lg"
                className="mt-6 w-full sm:w-auto"
                asChild
              >
                <Link href="#inscription">
                  Je m&apos;inscris maintenant
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TrustSection() {
  return (
    <section className="pb-14 sm:pb-20">
      <div className="px-4 sm:mx-auto sm:max-w-6xl sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-10 text-center text-primary-foreground sm:px-12 sm:py-14">
          <div
            className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-secondary/20 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <Shield className="mx-auto h-12 w-12 text-secondary" />
            <h2 className="mt-5 font-serif text-2xl font-bold sm:text-3xl">
              Vous n&apos;êtes jamais seul face à l&apos;inconnu
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-primary-foreground/85 sm:text-base">
              Chaque mise en relation est validée par un administrateur Meet &
              Match. Discussions encadrées, respect des intentions, et support
              humain à chaque étape.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button variant="secondary" size="lg" asChild>
                <Link href="/contact">
                  <MessageCircle className="h-5 w-5" />
                  Parler à un administrateur
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link href="#inscription">Créer mon compte</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RegisterSection() {
  return (
    <section
      id="inscription"
      className="scroll-mt-20 border-t border-border/60 bg-muted/40 py-14 sm:py-20"
    >
      <div className="px-4 sm:mx-auto sm:max-w-6xl sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-14">
          <div className="lg:sticky lg:top-24">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Rejoignez-nous
            </p>
            <h2 className="mt-2 font-serif text-2xl font-bold text-primary sm:text-3xl lg:text-4xl">
              Testez Meet & Match dès aujourd&apos;hui
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Inscrivez-vous en quelques clics. Complétez votre profil, activez
              votre compte et commencez à découvrir des personnes qui partagent
              vos attentes.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Inscription rapide par e-mail",
                "Profil personnalisable avec photos",
                "Équipe disponible gratuitement",
                "Accès gratuit possible sur demande",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 text-sm font-medium text-primary/90"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary/15">
                    <Check className="h-3.5 w-3.5 text-secondary" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted-foreground">
              Déjà membre ?{" "}
              <Link
                href="/connexion"
                className="font-medium text-secondary hover:underline"
              >
                Se connecter
              </Link>
            </p>
          </div>

          <div>
            <RegisterForm variant="embedded" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingStickyCta() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-card/95 p-3 backdrop-blur-md safe-area-pb sm:hidden">
      <div className="flex gap-2">
        <Button variant="outline" className="h-12 flex-1" asChild>
          <Link href="/connexion">Connexion</Link>
        </Button>
        <Button variant="secondary" className="h-12 flex-[2] text-base shadow-md shadow-secondary/20" asChild>
          <Link href="#inscription">
            Essayer gratuitement
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
