import type { Metadata } from "next";
import {
  UserCircle,
  Search,
  Heart,
  Users,
  CreditCard,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Fonctionnement",
  description:
    "Découvrez comment Meet & Match fonctionne : profil, likes, analyse par nos administrateurs et mise en relation encadrée.",
};

const steps = [
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
      "Nos administrateurs étudient les profils, les likes (y compris les likes réciproques), les préférences et les paiements pour identifier les meilleures compatibilités.",
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

export default function FonctionnementPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold text-primary">
          Comment fonctionne Meet & Match ?
        </h1>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          Meet & Match n&apos;est <strong>pas</strong> une application de chat libre.
          C&apos;est une plateforme de rencontre sérieuse où chaque mise en relation
          est validée et accompagnée par un administrateur.
        </p>
      </div>

      <div className="mt-12 rounded-2xl border-2 border-secondary/30 bg-accent/50 p-6 text-center">
        <p className="font-medium text-primary">
          Règle fondamentale : vous ne pouvez jamais envoyer de message privé
          directement à un autre membre.
        </p>
      </div>

      <div className="mt-12 space-y-6">
        {steps.map((step, index) => (
          <Card key={step.title} className="overflow-hidden">
            <CardContent className="flex gap-6 p-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-secondary">
                <step.icon className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
                  Étape {index + 1}
                </span>
                <h2 className="mt-1 font-serif text-xl font-semibold text-primary">
                  {step.title}
                </h2>
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
