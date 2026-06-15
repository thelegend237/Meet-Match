"use client";

import Image from "next/image";
import { Suspense } from "react";
import {
  Headphones,
  Heart,
  Loader2,
  Lock,
  MessageCircle,
  Shield,
  Users,
} from "lucide-react";
import { OnboardingWizard } from "@/components/public/onboarding-wizard";
import { Reveal } from "@/components/motion/motion";
import { cn } from "@/lib/utils";

export const LANDING_COUPLE_IMAGE = "/images/landing-couple.png";

const FEATURES = [
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
] as const;

const TRUST_ITEMS = [
  { icon: Lock, text: "Vos données sont 100% sécurisées" },
  { icon: Users, text: "Des milliers de célibataires sérieux vous attendent" },
  { icon: Headphones, text: "Support humain et réactif" },
] as const;

function LandingFeatureList({ className }: { className?: string }) {
  return (
    <ul className={cn("space-y-5", className)}>
      {FEATURES.map((item, i) => (
        <Reveal key={item.title} delay={80 + i * 70} direction="left">
          <li className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#fce7f3] text-[#e91e8c]">
              <item.icon className="h-5 w-5 stroke-[1.75]" />
            </div>
            <div className="pt-0.5">
              <p className="text-[15px] font-semibold text-[#2e1a47]">
                {item.title}
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-[#6b5f7a]">
                {item.desc}
              </p>
            </div>
          </li>
        </Reveal>
      ))}
    </ul>
  );
}

export function LandingCoverVisual({ className }: { className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <div
        className="pointer-events-none absolute -left-8 top-8 h-48 w-48 rounded-full bg-[#fce7f3]/80 blur-[1px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-4 top-2 h-40 w-40 rounded-[42%] bg-[#ede9fe]/70 blur-[1px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-6 left-1/4 h-24 w-24 rounded-full bg-[#e91e8c]/10 blur-2xl"
        aria-hidden
      />

      <div className="relative z-10 mx-auto max-w-[min(100%,420px)] pt-2 pl-1 sm:pl-2 lg:max-w-none lg:mx-0">
        <div className="relative aspect-square overflow-hidden rounded-[2rem] rounded-tl-[3.5rem] bg-white shadow-[0_28px_64px_rgba(91,61,143,0.18)]">
          <Image
            src={LANDING_COUPLE_IMAGE}
            alt="Couple souriant devant un cœur rose et violet"
            fill
            priority
            className="object-contain object-center"
            sizes="(max-width: 1024px) 90vw, 480px"
          />
        </div>
      </div>
    </div>
  );
}

export function LandingHeroAside({ showOnMobile = false }: { showOnMobile?: boolean }) {
  return (
    <aside
      className={cn(
        "flex flex-col",
        showOnMobile ? "flex" : "hidden lg:flex"
      )}
    >
      <Reveal direction="left">
        <h1 className="max-w-xl font-serif text-[2.15rem] font-bold leading-[1.15] tracking-tight text-[#2e1a47] sm:text-[2.35rem] xl:text-[2.65rem]">
          Commencez votre histoire dès{" "}
          <span className="text-[#e91e8c]">aujourd&apos;hui</span>
        </h1>
        <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-[#6b5f7a] sm:text-base">
          Rejoignez une communauté de célibataires sérieux, accompagnés par une
          équipe humaine à chaque étape de votre parcours.
        </p>
      </Reveal>

      <LandingFeatureList className="mt-9" />

      <Reveal delay={320} direction="left">
        <LandingCoverVisual className="mt-10 hidden lg:block" />
      </Reveal>
    </aside>
  );
}

export function LandingTrustBar() {
  return (
    <footer className="border-t border-[#ebe6f0]/80 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col divide-y divide-[#ebe6f0]/80 sm:flex-row sm:divide-x sm:divide-y-0">
        {TRUST_ITEMS.map((item) => (
          <div
            key={item.text}
            className="flex flex-1 items-center justify-center gap-3 px-6 py-5 text-center sm:justify-center sm:px-8"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ede9fe] text-[#7b3d8f]">
              <item.icon className="h-[18px] w-[18px] stroke-[1.75]" />
            </div>
            <span className="text-sm leading-snug text-[#6b5f7a]">
              {item.text}
            </span>
          </div>
        ))}
      </div>
    </footer>
  );
}

function WizardFallback() {
  return (
    <div className="flex min-h-[480px] items-center justify-center rounded-2xl bg-white shadow-[0_16px_50px_rgba(46,26,71,0.12)]">
      <Loader2 className="h-8 w-8 animate-spin text-[#e91e8c]" />
    </div>
  );
}

export function LandingHeroSection() {
  return (
    <div className="relative flex flex-col overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_15%_0%,rgba(252,231,243,0.55),transparent_55%),radial-gradient(ellipse_70%_50%_at_90%_10%,rgba(237,233,254,0.45),transparent_50%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="grid flex-1 items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_520px] lg:gap-16 xl:gap-20">
          <LandingHeroAside />

          <div id="inscription" className="w-full scroll-mt-24 lg:justify-self-end">
            <Reveal direction="right" delay={100} className="lg:hidden">
              <LandingCoverVisual className="mb-8" />
            </Reveal>

            <Reveal direction="right" delay={140}>
              <Suspense fallback={<WizardFallback />}>
                <OnboardingWizard mode="public" embedded />
              </Suspense>
            </Reveal>
          </div>
        </div>
      </div>

      <LandingTrustBar />
    </div>
  );
}
