"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  PaymentMethodPicker,
  resolvePaymentMethodForCheckout,
} from "@/components/user/payment-method-picker";
import { startRegistrationCheckout } from "@/lib/actions/payments";
import type { PaymentMethodId } from "@/lib/payments/providers";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const { confirm, dialog } = useConfirm();
  const free = isFreeFee(amount);
  const priceLabel = formatDisplayPrice(amount, currency);

  function runCheckout(method?: PaymentMethodId) {
    startTransition(async () => {
      const result = await startRegistrationCheckout(
        method ? { method } : undefined
      );
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

  async function handlePay() {
    if (!skipConfirm) {
      const confirmed = await confirm({
        title: free
          ? PRICING_TEST_MODE
            ? "Activer votre compte gratuitement ?"
            : "Activer votre compte gratuitement ?"
          : "Activer votre compte ?",
        description: free
          ? PRICING_TEST_MODE
            ? "Aucun paiement ne sera demandé pendant la phase test."
            : "Offre de lancement — aucun paiement ne sera demandé."
          : PRICING_TEST_MODE
            ? `Montant : ${priceLabel} (mode test — paiement simulé).`
            : `Montant : ${priceLabel} (tarif mondial en USD).`,
        confirmLabel: free ? "Activer" : "Payer",
      });
      if (!confirmed) return;
    }

    if (free || PRICING_TEST_MODE) {
      runCheckout();
      return;
    }

    startTransition(async () => {
      const method = await resolvePaymentMethodForCheckout(() => {
        setPickerOpen(true);
      });
      if (method) {
        runCheckout(method);
      }
    });
  }

  return (
    <>
      {dialog}
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
          : `Payer ${priceLabel}`}
      </Button>

      <PaymentMethodPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        amountLabel={priceLabel}
        onSelect={(method) => {
          setPickerOpen(false);
          runCheckout(method);
        }}
      />
    </>
  );
}
