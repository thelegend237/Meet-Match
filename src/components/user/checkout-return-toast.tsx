"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "@/hooks/use-toast";

/** Affiche un toast après retour Stripe Checkout (?checkout=success|cancel). */
export function CheckoutReturnToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    const checkout = searchParams.get("checkout");
    if (!checkout) return;
    handled.current = true;

    if (checkout === "success") {
      toast({
        title: "Paiement reçu",
        description:
          "Merci ! Votre compte ou match sera activé sous quelques secondes.",
      });
      router.refresh();
    } else if (checkout === "cancel") {
      toast({
        variant: "destructive",
        title: "Paiement annulé",
        description: "Aucun montant n'a été débité. Vous pouvez réessayer quand vous voulez.",
      });
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    url.searchParams.delete("type");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, [searchParams, router]);

  return null;
}
