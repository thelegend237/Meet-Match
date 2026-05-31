import type { Metadata } from "next";
import Link from "next/link";
import { Check, Gift, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  getMatchingFee,
  getRegistrationFee,
  MATCHING_FEATURES,
  REGISTRATION_FEATURES,
} from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Tarifs",
  description:
    "Frais d'inscription et de matching Meet & Match. Contact administrateur gratuit. Accès gratuit possible sur décision de l'administration.",
};

const regFee = getRegistrationFee(null);
const matchFee = getMatchingFee(null);

const pricingPlans = [
  {
    title: "Frais d'inscription",
    amount: regFee.amount,
    currency: regFee.currency,
    description:
      "Accès à la plateforme : création de profil, consultation des membres actifs et envoi de likes.",
    features: [...REGISTRATION_FEATURES, "Contact administrateur gratuit"],
    cta: "S'inscrire",
    href: "/inscription",
    highlighted: false,
  },
  {
    title: "Frais de matching",
    amount: matchFee.amount,
    currency: matchFee.currency,
    description:
      "Proposé uniquement lorsqu'un administrateur vous suggère une mise en relation compatible.",
    features: MATCHING_FEATURES,
    cta: "Créer mon compte",
    href: "/inscription",
    highlighted: true,
  },
];

export default function TarifsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="font-serif text-4xl font-bold text-primary">Nos tarifs</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Des tarifs transparents pour des rencontres sérieuses et accompagnées.
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        {pricingPlans.map((plan) => (
          <Card
            key={plan.title}
            className={
              plan.highlighted
                ? "border-2 border-secondary shadow-lg ring-1 ring-secondary/20"
                : ""
            }
          >
            <CardHeader>
              <CardTitle>{plan.title}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="font-serif text-4xl font-bold text-primary">
                  {formatCurrency(plan.amount, plan.currency)}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                variant={plan.highlighted ? "secondary" : "outline"}
                className="w-full"
                asChild
              >
                <Link href={plan.href}>{plan.cta}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Card className="bg-accent/30">
          <CardContent className="flex gap-4 p-6">
            <MessageCircle className="h-8 w-8 shrink-0 text-secondary" />
            <div>
              <h3 className="font-serif text-lg font-semibold text-primary">
                Contact administrateur gratuit
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Visiteurs et membres peuvent contacter notre équipe gratuitement à
                tout moment, sans engagement.
              </p>
              <Button variant="link" className="mt-2 h-auto p-0" asChild>
                <Link href="/contact">Écrire à un administrateur</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-accent/30">
          <CardContent className="flex gap-4 p-6">
            <Gift className="h-8 w-8 shrink-0 text-secondary" />
            <div>
              <h3 className="font-serif text-lg font-semibold text-primary">
                Accès gratuit possible
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                L&apos;administration peut accorder un accès gratuit à
                l&apos;inscription, au matching ou un accès complet, selon les
                situations.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Tarifs également disponibles en USD et CAD. Devises africaines (XAF) prévues
        prochainement.
      </p>
    </div>
  );
}
