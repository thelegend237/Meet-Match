"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startRegistrationCheckout } from "@/lib/actions/payments";
import {
  formatDisplayPrice,
  isFreeFee,
  PRICING_TEST_MODE,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface RegistrationPaymentButtonProps {
  amount: number;
  currency: string;
  className?: string;
  /** Skip the browser confirm dialog (e.g. onboarding final step). */
  skipConfirm?: boolean;
  /** Destination after successful activation (mode test / gratuit). */
  redirectTo?: string;
}

export function RegistrationPaymentButton({
  amount,
  currency,
  className,
  skipConfirm = false,
  redirectTo = "/decouvrir?activated=1",
}: RegistrationPaymentButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const free = isFreeFee(amount);

  function handlePay() {
    if (!skipConfirm) {
      const label = formatDisplayPrice(amount, currency);
      const message = free
        ? PRICING_TEST_MODE
          ? "Activer votre compte gratuitement pendant la phase test ?\n\nAucun paiement ne sera demandé."
          : "Activer votre compte gratuitement (offre de lancement) ?\n\nAucun paiement ne sera demandé."
        : PRICING_TEST_MODE
          ? `Confirmer le paiement de ${label} pour activer votre compte ?\n\n(Mode test — paiement simulé)`
          : `Vous allez être redirigé vers Stripe pour payer ${label} (tarif mondial en USD). Continuer ?`;

      if (!confirm(message)) {
        return;
      }
    }

    startTransition(async () => {
      const result = await startRegistrationCheckout();
      if ("error" in result && result.error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
        return;
      }

      if ("url" in result && result.url) {
        window.location.assign(result.url);
        return;
      }

      toast({
        title: free ? "Compte activé gratuitement" : "Compte activé",
        description:
          "Vous pouvez liker des profils et consulter vos matchs dès qu'une mise en relation est proposée.",
      });
      router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <Button
      variant="secondary"
      size="lg"
      className={cn("w-full sm:w-auto", className)}
      disabled={pending}
      onClick={handlePay}
    >
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : free ? (
        <Sparkles className="mr-2 h-4 w-4" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" />
      )}
      {free
        ? "Activer gratuitement"
        : `Payer ${formatDisplayPrice(amount, currency)}`}
    </Button>
  );
}
