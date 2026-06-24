"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmRegistrationPayment } from "@/lib/actions/payments";
import { formatDisplayPrice, isFreeFee, PRICING_TEST_MODE } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface RegistrationPaymentButtonProps {
  amount: number;
  currency: string;
  className?: string;
}

export function RegistrationPaymentButton({
  amount,
  currency,
  className,
}: RegistrationPaymentButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const free = isFreeFee(amount);

  function handlePay() {
    const label = formatDisplayPrice(amount, currency);
    const message = free
      ? "Activer votre compte gratuitement pendant la phase test ?\n\nAucun paiement ne sera demandé."
      : `Confirmer le paiement de ${label} pour activer votre compte ?\n\n(Mode test — paiement simulé, Stripe plus tard)`;

    if (!confirm(message)) {
      return;
    }

    startTransition(async () => {
      const result = await confirmRegistrationPayment();
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
      } else {
        toast({
          title: free ? "Compte activé gratuitement" : "Compte activé",
          description: "Vous pouvez maintenant découvrir les profils et liker.",
        });
        router.push("/decouvrir?welcome=1");
        router.refresh();
      }
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
        ? PRICING_TEST_MODE
          ? "Activer gratuitement"
          : "Activer mon compte"
        : `Payer ${formatDisplayPrice(amount, currency)}`}
    </Button>
  );
}
