import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  Clock,
  Gift,
  Headphones,
  Loader2,
  MessageCircle,
  Shield,
} from "lucide-react";
import ContactForm from "@/components/public/contact-form";
import { PublicPage } from "@/components/layout/public-page";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez gratuitement un administrateur Meet & Match. Visiteurs et membres bienvenus.",
};

export const dynamic = "force-dynamic";

const helpTopics = [
  {
    icon: MessageCircle,
    title: "Questions sur le fonctionnement",
    description: "Comprendre les likes, les matchs et les discussions encadrées.",
    href: "/fonctionnement",
    label: "Voir le parcours",
  },
  {
    icon: Gift,
    title: "Demande d'accès gratuit",
    description: "Inscription ou matching : l'équipe peut accorder un accès sur demande.",
    href: "/contact?subject=acces-gratuit",
    label: "Faire une demande",
  },
  {
    icon: Shield,
    title: "Signaler un profil",
    description: "Un comportement inapproprié ? Prévenez nos administrateurs.",
    href: "/contact?subject=signalement",
    label: "Signaler",
  },
] as const;

const reassurances = [
  {
    icon: Headphones,
    title: "100 % gratuit",
    text: "Aucun frais pour contacter l'équipe.",
  },
  {
    icon: Clock,
    title: "Réponse humaine",
    text: "Pas de bot : un administrateur vous lit.",
  },
  {
    icon: Shield,
    title: "Confidentiel",
    text: "Vos échanges restent entre vous et l'équipe.",
  },
] as const;

export default function ContactPage() {
  return (
    <PublicPage
      variant="landing"
      eyebrow="Besoin d'aide ?"
      title="Contactez notre équipe"
      description="Une question ? Un doute ? Écrivez-nous — c'est gratuit et sans engagement."
      wide
    >
      <div className="mm-landing-panel mb-10 overflow-hidden">
        <div className="flex flex-col gap-4 bg-gradient-to-br from-[#fce7f3]/40 via-white to-[#ede9fe]/30 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          <div className="mm-landing-icon-pink h-14 w-14 shrink-0">
            <Headphones className="h-6 w-6 stroke-[1.75]" />
          </div>
          <div>
            <p className="font-serif text-lg font-bold text-[#2e1a47] sm:text-xl">
              Une équipe à votre écoute
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#6b5f7a] sm:text-base">
              Visiteurs et membres peuvent nous écrire{" "}
              <strong className="font-semibold text-[#2e1a47]">gratuitement</strong>.
              Ce n&apos;est pas un chat entre membres — vous parlez directement avec
              Meet & Match.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        {reassurances.map((item) => (
          <article key={item.title} className="mm-landing-card p-5 text-center sm:text-left">
            <div className="mm-landing-icon-purple mx-auto h-11 w-11 sm:mx-0">
              <item.icon className="h-5 w-5 stroke-[1.75]" />
            </div>
            <h2 className="mt-3 font-serif text-base font-bold text-[#2e1a47]">
              {item.title}
            </h2>
            <p className="mt-1 text-sm text-[#6b5f7a]">{item.text}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)] lg:items-start lg:gap-12">
        <div className="order-2 space-y-4 lg:order-1">
          <h2 className="mm-landing-title text-xl sm:text-2xl">
            Besoin d&apos;aide sur…
          </h2>
          <p className="text-sm text-[#6b5f7a]">
            Choisissez un sujet fréquent ou utilisez le formulaire.
          </p>

          <div className="space-y-3">
            {helpTopics.map((topic) => (
              <Link
                key={topic.title}
                href={topic.href}
                className="mm-landing-card group flex gap-4 p-5 transition-colors hover:border-[#f0c4dc]/60"
              >
                <div className="mm-landing-icon-pink h-11 w-11 shrink-0">
                  <topic.icon className="h-5 w-5 stroke-[1.75]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-base font-bold text-[#2e1a47]">
                    {topic.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#6b5f7a]">
                    {topic.description}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#e91e8c] group-hover:underline">
                    {topic.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="order-1 lg:order-2 lg:sticky lg:top-24">
          <Suspense
            fallback={
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-[#e91e8c]" />
              </div>
            }
          >
            <ContactForm />
          </Suspense>
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
          <Link href="/tarifs">Voir les tarifs</Link>
        </Button>
      </div>
    </PublicPage>
  );
}
