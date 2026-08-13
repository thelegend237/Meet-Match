"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { syncPayPalCheckoutOrder } from "@/lib/actions/paypal-sync";
import { syncStripeCheckoutSession } from "@/lib/actions/stripe-sync";
import { toast } from "@/hooks/use-toast";

/** Toast + sync après retour checkout (?checkout=success|cancel). */
export function CheckoutReturnToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const checkout = searchParams.get("checkout");
    if (!checkout) return;
    handled.current = true;

    const paypalOrderId = searchParams.get("token");
    const stripeSessionId = searchParams.get("session_id");

    async function handleReturn() {
      if (checkout === "success") {
        let synced = false;
        let syncError: string | null = null;

        if (paypalOrderId) {
          const result = await syncPayPalCheckoutOrder(paypalOrderId);
          synced = "success" in result && result.success === true;
          if ("error" in result && result.error) syncError = result.error;
        } else if (stripeSessionId) {
          const result = await syncStripeCheckoutSession(stripeSessionId);
          synced = "success" in result && result.success === true;
          if ("error" in result && result.error) syncError = result.error;
        }

        if (syncError) {
          toast({
            variant: "destructive",
            title: "Synchronisation du paiement",
            description: syncError,
          });
        } else {
          toast({
            title: synced ? "Paiement confirmé" : "Paiement reçu",
            description: synced
              ? "Votre compte ou match est activé."
              : "Merci ! Votre compte ou match sera activé sous quelques secondes.",
          });
        }

        router.refresh();
      } else if (checkout === "cancel") {
        toast({
          variant: "destructive",
          title: "Paiement annulé",
          description:
            "Aucun montant n'a été débité. Vous pouvez réessayer quand vous voulez.",
        });
      }

      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      url.searchParams.delete("type");
      url.searchParams.delete("token");
      url.searchParams.delete("PayerID");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.pathname + url.search);
    }

    void handleReturn();
  }, [searchParams, router]);

  return null;
}
