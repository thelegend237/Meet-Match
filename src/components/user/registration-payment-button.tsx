"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmRegistrationPayment } from "@/lib/actions/payments";
import { cn, formatCurrency } from "@/lib/utils";
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

  function handlePay() {
    const label = formatCurrency(amount, currency);
    if (
      !confirm(
        `Confirmer le paiement de ${label} pour activer votre compte ?\n\n(Mode test — paiement simulé, Stripe plus tard)`
      )
    ) {
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
          title: "Compte activé",
          description: "Vous pouvez maintenant découvrir les profils.",
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
      ) : (
        <CreditCard className="mr-2 h-4 w-4" />
      )}
      Payer {formatCurrency(amount, currency)}
    </Button>
  );
}
