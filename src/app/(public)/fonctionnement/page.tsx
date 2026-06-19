import type { Metadata } from "next";
import Link from "next/link";
import {
  UserCircle,
  Search,
  Heart,
  Users,
  CreditCard,
  MessageSquare,
  ArrowRight,
  Shield,
  Ban,
  Headphones,
  CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PublicPage } from "@/components/layout/public-page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Fonctionnement",
  description:
    "Découvrez comment Meet & Match fonctionne : profil, likes, analyse par nos administrateurs et mise en relation encadrée.",
};

const steps: {
  icon: LucideIcon;
  title: string;
  description: string;
}[] = [
  {
    icon: UserCircle,
    title: "Créez votre profil",
    description:
      "Inscrivez-vous, complétez votre profil avec vos informations personnelles, vos attentes et une photo principale. Un profil complet augmente vos chances d'être remarqué par notre équipe.",
  },
  {
    icon: Search,
    title: "Consultez les profils",
    description:
      "Une fois votre inscription validée, parcourez les profils de membres actifs compatibles avec vos critères. Vous voyez la photo, le nom, l'âge, le pays et la ville — sans possibilité de contacter directement.",
  },
  {
    icon: Heart,
    title: "Envoyez des likes",
    description:
      "Exprimez votre intérêt en likant les profils qui vous plaisent. Chaque like est enregistré et visible par nos administrateurs. Vous ne pouvez pas liker deux fois le même profil.",
  },
  {
    icon: Users,
    title: "Notre équipe analyse les compatibilités",
    description:
      "Nos administrateurs étudient les profils, les likes (y compris les likes réciproques ou à sens unique), les préférences et les paiements pour identifier les meilleures compatibilités.",
  },
  {
    icon: CreditCard,
    title: "Paiement du matching",
    description:
      "Lorsqu'un administrateur vous propose un match, chaque personne doit régler les frais de matching (ou bénéficier d'un accès gratuit accordé par l'administration).",
  },
  {
    icon: MessageSquare,
    title: "Discussion groupée encadrée",
    description:
      "Si les deux personnes ont payé (ou bénéficié d'un accès gratuit), une discussion groupée est ouverte avec un administrateur présent. Ce n'est pas un chat libre : chaque échange est accompagné.",
  },
];

const rules = [
  {
    icon: Ban,
    title: "Pas de message privé",
    description:
      "Vous ne pouvez jamais écrire directement à un autre membre. Aucun chat libre entre inconnus.",
  },
  {
    icon: Shield,
    title: "Match proposé par l'équipe",
    description:
      "Chaque mise en relation est initiée par un administrateur après analyse des profils.",
  },
  {
    icon: Headphones,
    title: "Contact équipe autorisé",
    description:
      "Vous pouvez toujours contacter gratuitement l'équipe Meet & Match pour vos questions.",
  },
] as const;

const conversationTypes = [
  {
    type: "Match accompagné",
    who: "Admin + les deux membres",
    when: "Après proposition de match et paiements validés",
    highlight: true,
  },
  {
    type: "Contact équipe",
    who: "Vous + administrateur",
    when: "À tout moment via le formulaire contact",
    highlight: false,
  },
] as const;

export default function FonctionnementPage() {
  return (
    <PublicPage
      variant="landing"
      eyebrow="Simple & transparent"
      title="Comment fonctionne Meet & Match ?"
      description="Meet & Match n'est pas une application de chat libre. C'est une plateforme de rencontre sérieuse où chaque mise en relation est validée et accompagnée par un administrateur."
      wide
    >
      <div className="mm-landing-panel mb-10 overflow-hidden">
        <div className="flex flex-col gap-4 bg-gradient-to-br from-[#fce7f3]/40 via-white to-[#ede9fe]/30 p-6 sm:flex-row sm:items-center sm:gap-6 sm:p-8">
          <div className="mm-landing-icon-pink h-14 w-14 shrink-0">
            <Shield className="h-6 w-6 stroke-[1.75]" />
          </div>
          <div>
            <p className="font-sans text-lg font-bold text-[#2e1a47] sm:text-xl">
              Règle fondamentale
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[#6b5f7a] sm:text-base">
              Vous ne pouvez <strong className="font-semibold text-[#2e1a47]">jamais</strong>{" "}
              envoyer de message privé directement à un autre membre. Chaque
              conversation passe par l&apos;invitation de l&apos;équipe.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-12 grid gap-4 sm:grid-cols-3">
        {rules.map((rule) => (
          <article key={rule.title} className="mm-landing-card p-5 sm:p-6">
            <div className="mm-landing-icon-pink h-11 w-11">
              <rule.icon className="h-5 w-5 stroke-[1.75]" />
            </div>
            <h2 className="mt-4 font-sans text-base font-bold text-[#2e1a47] sm:text-lg">
              {rule.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#6b5f7a]">
              {rule.description}
            </p>
          </article>
        ))}
      </div>

      <div className="relative">
        <div
          className="absolute bottom-8 left-[1.65rem] top-8 hidden w-0.5 bg-gradient-to-b from-[#e91e8c]/30 via-[#7b3d8f]/20 to-transparent sm:block"
          aria-hidden
        />

        <div className="space-y-5">
          {steps.map((step, index) => (
            <article
              key={step.title}
              className="mm-landing-card relative overflow-hidden"
            >
              <div className="flex gap-4 p-5 sm:gap-6 sm:p-6">
                <div className="relative z-10 flex shrink-0 flex-col items-center gap-2">
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold shadow-md sm:h-14 sm:w-14",
                      index % 2 === 0
                        ? "bg-[#e91e8c] text-white shadow-[#e91e8c]/25"
                        : "bg-[#7b3d8f] text-white shadow-[#7b3d8f]/25"
                    )}
                  >
                    <step.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <span className="font-sans text-xs font-bold text-[#9b8fa8]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="mm-landing-eyebrow text-[10px]">
                    Étape {index + 1}
                  </p>
                  <h2 className="mt-1 font-sans text-lg font-bold text-[#2e1a47] sm:text-xl">
                    {step.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#6b5f7a] sm:text-[15px]">
                    {step.description}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <section className="mt-12">
        <h2 className="mm-landing-title text-center text-2xl sm:text-3xl">
          Les conversations sur Meet & Match
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#6b5f7a] sm:text-base">
          Deux types d&apos;échanges possibles — jamais de messagerie libre entre
          membres.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {conversationTypes.map((row) => (
            <article
              key={row.type}
              className={cn(
                "rounded-2xl border p-5 sm:p-6",
                row.highlight
                  ? "border-[#f0c4dc]/80 bg-gradient-to-br from-white to-[#fce7f3]/25 shadow-[0_8px_32px_rgba(46,26,71,0.08)]"
                  : "mm-landing-card"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-sans text-lg font-bold text-[#2e1a47]">
                  {row.type}
                </h3>
                {row.highlight && (
                  <span className="shrink-0 rounded-full bg-[#fce7f3] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#be185d]">
                    Principal
                  </span>
                )}
              </div>
              <ul className="mt-4 space-y-3 text-sm text-[#6b5f7a]">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#e91e8c]" />
                  <span>
                    <span className="font-medium text-[#2e1a47]">Participants :</span>{" "}
                    {row.who}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#e91e8c]" />
                  <span>
                    <span className="font-medium text-[#2e1a47]">Quand :</span>{" "}
                    {row.when}
                  </span>
                </li>
              </ul>
            </article>
          ))}
        </div>
      </section>

      <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
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
        <Button
          variant="ghost"
          size="lg"
          className="w-full rounded-full text-[#6b5f7a] hover:bg-[#fce7f3]/40 hover:text-[#2e1a47] sm:w-auto"
          asChild
        >
          <Link href="/contact">Contacter l&apos;équipe</Link>
        </Button>
      </div>
    </PublicPage>
  );
}
