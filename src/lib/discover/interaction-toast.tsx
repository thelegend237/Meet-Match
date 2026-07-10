"use client";

import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  isSubscriptionRequiredError,
  SUBSCRIPTION_REQUIRED_ERROR,
} from "@/lib/discover/subscription";
import { PRICING_TEST_MODE } from "@/lib/pricing";

export function showSubscriptionRequiredToast() {
  toast({
    variant: "destructive",
    title: PRICING_TEST_MODE ? "Compte non activé" : "Abonnement requis",
    description: PRICING_TEST_MODE
      ? "Activez gratuitement votre compte pour envoyer des likes et accéder aux matchs."
      : "Vous pouvez parcourir les profils gratuitement. Activez votre compte pour liker et interagir.",
    action: (
      <ToastAction
        altText="Activer mon compte"
        onClick={() => {
          window.location.assign("/paiements?welcome=1");
        }}
      >
        {PRICING_TEST_MODE ? "Activer gratuitement" : "Activer mon compte"}
      </ToastAction>
    ),
  });
}

export function showDiscoverActionError(error?: string | null) {
  if (isSubscriptionRequiredError(error)) {
    showSubscriptionRequiredToast();
    return;
  }
  toast({
    variant: "destructive",
    title: "Erreur",
    description: error ?? "Une erreur est survenue.",
  });
}

export { SUBSCRIPTION_REQUIRED_ERROR };
