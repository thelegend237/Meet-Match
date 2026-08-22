"use client";

import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { clearPushInviteDismiss } from "@/lib/push/client";

/** Nudge push après le premier like réussi. */
export function nudgePushAfterFirstLike() {
  clearPushInviteDismiss();
  toast({
    title: "Like enregistré",
    description:
      "Activez les alertes pour être prévenu dès qu'un match ou un message arrive.",
    action: (
      <ToastAction
        altText="Activer les alertes"
        onClick={() => {
          window.location.assign("/notifications");
        }}
      >
        Activer les alertes
      </ToastAction>
    ),
  });
}
