"use client";

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
import { Reveal, Float } from "@/components/motion/motion";

const regFee = getRegistrationFee(null);

type SectionVariant = "default" | "landing";

function HeroVisual() {
  return (
    <Float slow className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div
        className="absolute -right-8 top-0 h-48 w-48 rounded-full bg-secondary/15 blur-3xl mm-motion-float-slow"
        aria-hidden
      />
      <div
        className="absolute -left-4 bottom-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent via-white to-secondary/10 p-1 shadow-xl mm-hover-lift">
        <div className="overflow-hidden rounded-[1.35rem] bg-gradient-to-t from-primary/80 via-primary/20 to-transparent">
          <div
            className="aspect-[4/3] bg-[url('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80')] bg-cover bg-center"
            role="img"
            aria-label="Couple souriant"
          />
        </div>
      </div>
    </Float>
  );
}

export function HeroSection() {
  const features = [
    {
      icon: Shield,
      title: "Sécurisé & Vérifié",
      desc: "Profils contrôlés par notre équipe",
    },
    {
      icon: Heart,
      title: "Rencontres sérieuses",
      desc: "Des intentions claires et sincères",
    },
    {
      icon: MessageCircle,
      title: "Accompagnement humain",
      desc: "Matchs proposés, pas de swipe anonyme",
    },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-background to-accent/30">
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_90%_0%,rgba(233,30,140,0.12),transparent)]"
        aria-hidden
      />

      <div className="relative px-4 pb-16 pt-8 sm:mx-auto sm:max-w-7xl sm:px-6 sm:pb-24 sm:pt-12 lg:pt-16">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <Reveal direction="left">
              <h1 className="font-sans text-3xl font-bold leading-tight tracking-tight text-primary sm:text-4xl lg:text-[2.65rem]">
                Commencez votre histoire dès{" "}
                <span className="text-secondary">aujourd&apos;hui</span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                Rejoignez Meet & Match pour des rencontres authentiques et
                sérieuses, accompagnées par une équipe dédiée à votre réussite.
              </p>
            </Reveal>

            <ul className="mt-8 space-y-4">
              {features.map((item, i) => (
                <Reveal key={item.title} delay={100 + i * 80} direction="left">
                  <li className="flex gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent shadow-sm">
                      <item.icon className="h-6 w-6 text-secondary" />
                    </div>
                    <div>
                      <p className="font-semibold text-primary">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ul>

            <Reveal delay={400} direction="left">
              <div className="mt-10 hidden lg:block">
                <HeroVisual />
              </div>
            </Reveal>
          </div>

          <Reveal direction="right" delay={120} className="scroll-mt-24 lg:pt-4" as="div">
            <div id="inscription" className="mm-card-elevated mm-hover-lift overflow-hidden p-6 sm:p-8">
              <p className="text-center text-xs font-semibold uppercase tracking-wider text-secondary">
                Créer votre compte
              </p>
              <h2 className="mt-2 text-center font-sans text-xl font-bold text-primary sm:text-2xl">
                Rejoignez Meet & Match
              </h2>
              <p className="mt-2 text-center text-sm text-muted-foreground">
                Inscription guidée · Quelques minutes
              </p>
              <div className="mt-6">
                <RegisterForm variant="embedded" />
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200} className="mt-10 lg:hidden">
          <HeroVisual />
        </Reveal>
      </div>
    </section>
  );
}

export function SocialProofSection() {
  const items = [
    { icon: Shield, text: "Vos données sont 100% sécurisées" },
    { icon: Users, text: "Des milliers de célibataires sérieux vous attendent" },
    { icon: MessageCircle, text: "Support humain et réactif" },
  ];

  return (
    <section className="border-y border-border/50 bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-border/50 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        {items.map((item, i) => (
          <Reveal key={item.text} delay={i * 100} direction="up">
            <div className="flex items-center justify-center gap-3 px-6 py-5 text-center sm:py-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
              <item.icon className="h-5 w-5 text-secondary" />
            </div>
            <p className="text-left text-xs font-medium leading-snug text-muted-foreground sm:text-sm">
              {item.text}
            </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function WhySection({ variant = "default" }: { variant?: SectionVariant }) {
  const isLanding = variant === "landing";
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
    <section className={cn(isLanding ? "mm-landing-section" : "py-14 sm:py-20")}>
      <div className={cn(isLanding ? "mm-landing-section-inner" : "px-4 sm:mx-auto sm:max-w-6xl sm:px-6")}>
        <Reveal className="mx-auto max-w-2xl text-center">
          {isLanding && (
            <p className="mm-landing-eyebrow">Notre différence</p>
          )}
          <h2 className={cn(isLanding ? "mm-landing-title mt-2" : "font-sans text-2xl font-bold text-primary sm:text-3xl lg:text-4xl")}>
            Pourquoi choisir Meet & Match ?
          </h2>
          <p className={cn("mt-3", isLanding ? "mm-landing-subtitle" : "text-sm leading-relaxed text-muted-foreground sm:text-base")}>
            Une alternative aux applications de rencontre classiques, pensée pour
            les personnes qui veulent être accompagnées, pas submergées.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {reasons.map((item, i) => (
            <Reveal key={item.title} delay={80 + i * 70} direction="up">
              <div
                className={cn(
                  "group p-5 sm:p-6",
                  isLanding
                    ? "mm-landing-card"
                    : "mm-hover-lift rounded-2xl border border-border/60 bg-card shadow-sm transition-all hover:border-secondary/30 hover:shadow-md"
                )}
              >
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center transition-transform group-hover:scale-105",
                  isLanding
                    ? "mm-landing-icon-pink"
                    : "rounded-xl bg-gradient-to-br from-secondary/15 to-primary/5 text-secondary"
                )}
              >
                <item.icon className="h-5 w-5 stroke-[1.75]" />
              </div>
              <h3 className={cn("mt-4 font-sans text-lg font-semibold", isLanding ? "text-[#2e1a47]" : "text-primary")}>
                {item.title}
              </h3>
              <p className={cn("mt-2 text-sm leading-relaxed", isLanding ? "text-[#6b5f7a]" : "text-muted-foreground")}>
                {item.description}
              </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function StepsSection({ variant = "default" }: { variant?: SectionVariant }) {
  const isLanding = variant === "landing";
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
    <section
      className={cn(
        isLanding
          ? "mm-landing-section bg-[#f3eef8]/50"
          : "bg-muted/30 py-14 sm:py-20"
      )}
    >
      <div className={cn(isLanding ? "mm-landing-section-inner" : "px-4 sm:mx-auto sm:max-w-6xl sm:px-6")}>
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className={cn(isLanding ? "mm-landing-eyebrow" : "text-xs font-semibold uppercase tracking-wider text-secondary")}>
              Simple & transparent
            </p>
            <h2 className={cn(isLanding ? "mm-landing-title mt-2" : "mt-2 font-sans text-2xl font-bold text-primary sm:text-3xl lg:text-4xl")}>
              Comment ça marche ?
            </h2>
            <p className={cn("mt-2 max-w-lg", isLanding ? "mm-landing-subtitle" : "text-sm text-muted-foreground sm:text-base")}>
              Trois étapes claires. Pas de chat libre entre utilisateurs — chaque
              rencontre est méritée et accompagnée.
            </p>
          </div>
          <Button
            variant="outline"
            className={cn("shrink-0", isLanding && "mm-landing-btn-outline border-[#d8cfe8]")}
            asChild
          >
            <Link href="/fonctionnement">
              Détails du parcours
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="relative mt-10 lg:mt-14">
          <div
            className="absolute left-0 right-0 top-12 hidden h-0.5 bg-gradient-to-r from-transparent via-[#e91e8c]/25 to-transparent lg:block"
            aria-hidden
          />
          <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
            {steps.map((item, index) => (
              <Reveal key={item.step} delay={100 + index * 120} direction="up">
                <div
                  className={cn(
                    "relative p-6",
                    isLanding
                      ? "mm-landing-card"
                      : "rounded-2xl border border-border/60 bg-card shadow-sm mm-hover-lift",
                    index === 1 && "lg:translate-y-4"
                  )}
                >
                <span className="font-sans text-4xl font-bold text-[#2e1a47]/10">
                  {item.step}
                </span>
                <div
                  className={cn(
                    "mt-2 flex h-12 w-12 items-center justify-center",
                    isLanding
                      ? "rounded-full bg-[#e91e8c] text-white shadow-md shadow-[#e91e8c]/25"
                      : "rounded-2xl bg-secondary text-secondary-foreground shadow-md shadow-secondary/25"
                  )}
                >
                  <item.icon className="h-6 w-6" />
                </div>
                <h3 className={cn("mt-4 font-sans text-xl font-semibold", isLanding ? "text-[#2e1a47]" : "text-primary")}>
                  {item.title}
                </h3>
                <p className={cn("mt-2 text-sm leading-relaxed", isLanding ? "text-[#6b5f7a]" : "text-muted-foreground")}>
                  {item.description}
                </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PricingTeaserSection({ variant = "default" }: { variant?: SectionVariant }) {
  const isLanding = variant === "landing";

  return (
    <section className={cn(isLanding ? "mm-landing-section py-14 sm:py-16" : "py-14 sm:py-16")}>
      <div className={cn(isLanding ? "mm-landing-section-inner" : "px-4 sm:mx-auto sm:max-w-6xl sm:px-6")}>
        <div
          className={cn(
            "overflow-hidden p-6 sm:p-10",
            isLanding
              ? "mm-landing-panel bg-gradient-to-br from-white via-white to-[#fce7f3]/25"
              : "rounded-3xl border border-border/60 bg-gradient-to-br from-card via-card to-accent/30 shadow-lg"
          )}
        >
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className={cn(isLanding ? "mm-landing-eyebrow" : "text-xs font-semibold uppercase tracking-wider text-secondary")}>
                Tarifs transparents
              </p>
              <h2 className={cn("mt-2 font-sans text-2xl font-bold sm:text-3xl", isLanding ? "text-[#2e1a47]" : "text-primary")}>
                Commencez pour{" "}
                {formatCurrency(regFee.amount, regFee.currency)}
              </h2>
              <p className={cn("mt-3 text-sm leading-relaxed sm:text-base", isLanding ? "text-[#6b5f7a]" : "text-muted-foreground")}>
                Un paiement unique pour rejoindre la communauté. Les frais de
                matching ne sont dus que lorsqu&apos;un administrateur vous propose
                une rencontre compatible.
              </p>
              <ul className="mt-5 space-y-2">
                {REGISTRATION_FEATURES.slice(0, 4).map((f) => (
                  <li
                    key={f}
                    className={cn("flex items-center gap-2 text-sm", isLanding ? "text-[#2e1a47]/90" : "text-foreground/90")}
                  >
                    <Check className="h-4 w-4 shrink-0 text-[#e91e8c]" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button variant="secondary" className="mt-6 shadow-md shadow-[#e91e8c]/20" asChild>
                <Link href="/tarifs">
                  Voir tous les tarifs
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div
              className={cn(
                "rounded-2xl p-6 sm:p-8",
                isLanding
                  ? "bg-gradient-to-br from-[#2e1a47] via-[#4a2d7a] to-[#7b3d8f] text-white"
                  : "bg-primary text-primary-foreground"
              )}
            >
              <p className="text-sm text-white/80">
                Prêt à tester ?
              </p>
              <p className="mt-2 font-sans text-3xl font-bold">
                Créez votre compte en 2 minutes
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/85">
                Rejoignez des membres sérieux. Notre équipe reste disponible
                gratuitement si vous avez la moindre question.
              </p>
              <Button
                variant="secondary"
                size="lg"
                className="mt-6 w-full shadow-md shadow-[#e91e8c]/25 sm:w-auto"
                asChild
              >
                <Link href="/#inscription">
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

export function TrustSection({ variant = "default" }: { variant?: SectionVariant }) {
  const isLanding = variant === "landing";

  return (
    <section className={cn(isLanding ? "mm-landing-section pb-14 sm:pb-20" : "pb-14 sm:pb-20")}>
      <div className={cn(isLanding ? "mm-landing-section-inner" : "px-4 sm:mx-auto sm:max-w-6xl sm:px-6")}>
        <div
          className={cn(
            "relative overflow-hidden px-6 py-10 text-center sm:px-12 sm:py-14",
            isLanding
              ? "rounded-3xl bg-gradient-to-br from-[#2e1a47] via-[#4a2d7a] to-[#7b3d8f] text-white shadow-[0_16px_48px_rgba(46,26,71,0.2)]"
              : "rounded-3xl bg-primary text-primary-foreground"
          )}
        >
          <div
            className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#e91e8c]/20 blur-3xl"
            aria-hidden
          />
          <div
            className="absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-[#fce7f3]/15 blur-3xl"
            aria-hidden
          />
          <div className="relative">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#fce7f3]/20">
              <Shield className="h-7 w-7 text-[#fce7f3]" />
            </div>
            <h2 className="mt-5 font-sans text-2xl font-bold sm:text-3xl">
              Vous n&apos;êtes jamais seul face à l&apos;inconnu
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
              Chaque mise en relation est validée par un administrateur Meet &
              Match. Discussions encadrées, respect des intentions, et support
              humain à chaque étape.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button variant="secondary" size="lg" className="shadow-md shadow-[#e91e8c]/25" asChild>
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
                <Link href="/#inscription">Créer mon compte</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function RegisterSection({ variant = "default" }: { variant?: SectionVariant }) {
  const isLanding = variant === "landing";

  return (
    <section
      id="inscription-bas"
      className={cn(
        "scroll-mt-20 py-14 sm:py-20",
        isLanding
          ? "border-t border-[#ebe6f0]/80"
          : "border-t border-border/60 bg-muted/40"
      )}
    >
      <div className={cn(isLanding ? "mm-landing-section-inner" : "px-4 sm:mx-auto sm:max-w-6xl sm:px-6")}>
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-14">
          <div className="lg:sticky lg:top-24">
            <p className={cn(isLanding ? "mm-landing-eyebrow" : "text-xs font-semibold uppercase tracking-wider text-secondary")}>
              Rejoignez-nous
            </p>
            <h2 className={cn("mt-2 font-sans text-2xl font-bold sm:text-3xl lg:text-4xl", isLanding ? "text-[#2e1a47]" : "text-primary")}>
              Testez Meet & Match dès aujourd&apos;hui
            </h2>
            <p className={cn("mt-4 text-sm leading-relaxed sm:text-base", isLanding ? "text-[#6b5f7a]" : "text-muted-foreground")}>
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
                  className={cn("flex items-center gap-3 text-sm font-medium", isLanding ? "text-[#2e1a47]/90" : "text-primary/90")}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fce7f3]">
                    <Check className="h-3.5 w-3.5 text-[#e91e8c]" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <p className={cn("mt-6 text-sm", isLanding ? "text-[#6b5f7a]" : "text-muted-foreground")}>
              Déjà membre ?{" "}
              <Link
                href="/connexion"
                className="font-medium text-[#e91e8c] hover:underline"
              >
                Se connecter
              </Link>
            </p>
          </div>

          <div
            className={cn(
              isLanding
                ? "overflow-hidden rounded-2xl bg-white p-2 shadow-[0_16px_50px_rgba(46,26,71,0.12)] sm:p-3"
                : "mm-card-elevated p-2 sm:p-3"
            )}
          >
            <RegisterForm variant="embedded" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingStickyCta({ variant = "default" }: { variant?: SectionVariant }) {
  const isLanding = variant === "landing";

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t p-3 backdrop-blur-md safe-area-pb sm:hidden",
        isLanding
          ? "border-[#ebe6f0]/90 bg-white/95"
          : "border-border/80 bg-card/95"
      )}
    >
      <div className="flex gap-2">
        <Button
          variant="outline"
          className={cn("h-12 flex-1", isLanding && "mm-landing-btn-outline")}
          asChild
        >
          <Link href="/connexion">Connexion</Link>
        </Button>
        <Button variant="secondary" className="h-12 flex-[2] text-base shadow-md shadow-[#e91e8c]/20" asChild>
          <Link href="/#inscription">
            Essayer gratuitement
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
