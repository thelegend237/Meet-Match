"use client";

import Link from "next/link";
import { Headphones, Heart, Lock, Shield, type LucideIcon } from "lucide-react";
import { Header } from "@/components/public/header";
import { Reveal, ScaleHover } from "@/components/motion/motion";

const TRUST_ITEMS = [
  { icon: Shield, text: "Profils vérifiés par notre équipe" },
  { icon: Heart, text: "Rencontres sérieuses et accompagnées" },
  { icon: Lock, text: "Connexion sécurisée et chiffrée" },
] as const;

export function AuthPageShell({
  children,
  footer,
  title,
  subtitle = "Connectez-vous pour accéder à vos matchs, messages et profils.",
}: {
  children: React.ReactNode;
  footer?: React.ReactNode | null;
  title?: React.ReactNode;
  subtitle?: string;
}) {
  const heading =
    title ?? (
      <>
        Bon retour{" "}
        <span className="text-[#e91e8c]">parmi nous</span>
      </>
    );

  return (
    <div className="mm-landing-page flex min-h-screen flex-col">
      <Header />
      <div className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1fr_minmax(0,480px)] lg:gap-16">
          <aside className="hidden lg:block lg:pr-6">
            <Reveal direction="left">
              <h1 className="mm-landing-title text-[2rem] leading-tight xl:text-[2.25rem]">
                {heading}
              </h1>
              <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#6b5f7a]">
                {subtitle}
              </p>
            </Reveal>
            <ul className="mt-8 space-y-4">
              {TRUST_ITEMS.map((item, i) => (
                <Reveal key={item.text} delay={120 + i * 90} direction="left">
                  <li className="flex items-center gap-3.5">
                    <div className="mm-landing-icon-pink h-10 w-10 shrink-0">
                      <item.icon className="h-5 w-5 stroke-[1.75]" />
                    </div>
                    <span className="text-sm font-medium text-[#2e1a47]/90">
                      {item.text}
                    </span>
                  </li>
                </Reveal>
              ))}
            </ul>
            <Reveal delay={450} direction="left">
              <p className="mt-10 flex items-center gap-2 text-sm text-[#6b5f7a]">
                <Headphones className="h-4 w-4 text-[#e91e8c]" />
                Besoin d&apos;aide ?{" "}
                <Link
                  href="/contact"
                  className="font-semibold text-[#e91e8c] hover:underline"
                >
                  Contactez le support
                </Link>
              </p>
            </Reveal>
          </aside>

          <div className="w-full lg:max-w-[480px] lg:justify-self-end">
            <Reveal direction="right" delay={80} className="mb-6 text-center lg:hidden">
              <h1 className="mm-landing-title text-2xl">{heading}</h1>
              <p className="mt-2 text-sm text-[#6b5f7a]">{subtitle}</p>
            </Reveal>
            <ScaleHover>
              <Reveal direction="up" delay={100}>
                {children}
              </Reveal>
            </ScaleHover>
            {footer === undefined && (
              <p className="mt-6 text-center text-sm text-[#6b5f7a]">
                Pas encore de compte ?{" "}
                <Link
                  href="/inscription"
                  className="font-semibold text-[#e91e8c] hover:underline"
                >
                  S&apos;inscrire
                </Link>
              </p>
            )}
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthFormCard({
  title,
  subtitle,
  icon: Icon,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <article className="mm-landing-panel mm-hover-lift overflow-hidden">
      <div
        className="h-1.5 w-full bg-gradient-to-r from-[#7b3d8f] via-[#e91e8c] to-[#f9a8d4]"
        aria-hidden
      />

      <div className="border-b border-[#ebe6f0]/80 bg-gradient-to-br from-white via-white to-[#fce7f3]/20 px-6 py-6 sm:px-8">
        <div className="flex items-start gap-4">
          {Icon && (
            <div className="mm-landing-icon-pink h-12 w-12 shrink-0">
              <Icon className="h-5 w-5 stroke-[1.75]" />
            </div>
          )}
          <div className={Icon ? undefined : "w-full"}>
            <h2 className="font-sans text-xl font-bold text-[#2e1a47] sm:text-2xl">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-sm leading-relaxed text-[#6b5f7a]">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white px-6 py-6 sm:px-8">{children}</div>

      {footer && (
        <div className="border-t border-[#ebe6f0]/80 bg-[#faf8fc]/60 px-6 py-5 sm:px-8">
          {footer}
        </div>
      )}
    </article>
  );
}
