"use client";

import { useEffect } from "react";
import { ensurePushServiceWorker, isPushEnvironmentSupported } from "@/lib/push/client";

/** Pré-enregistre le service worker dès la connexion (évite les erreurs à l'activation push). */
export function PushBootstrap() {
  useEffect(() => {
    if (!isPushEnvironmentSupported()) return;
    void ensurePushServiceWorker().catch(() => {
      /* l'utilisateur verra le détail sur /notifications */
    });
  }, []);

  return null;
}
