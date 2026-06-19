"use client";

import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import {
  isSubscriptionRequiredError,
  SUBSCRIPTION_REQUIRED_ERROR,
} from "@/lib/discover/subscription";

export function showSubscriptionRequiredToast() {
  toast({
    variant: "destructive",
    title: "Abonnement requis",
    description:
      "Vous pouvez parcourir les profils gratuitement. Activez votre compte pour liker et interagir.",
    action: (
      <ToastAction
        altText="Activer mon compte"
        onClick={() => {
          window.location.assign("/paiements");
        }}
      >
        Activer mon compte
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
