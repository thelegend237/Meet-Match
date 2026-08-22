"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  dismissPushInvite,
  getPushDiagnostics,
  isDevToolsMobileEmulation,
  isPushEnvironmentSupported,
  isPushInviteDismissed,
  subscribeToPushNotifications,
} from "@/lib/push/client";

interface PushInviteBannerProps {
  notifyPush?: boolean;
}

export function PushInviteBanner({ notifyPush = true }: PushInviteBannerProps) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluateVisibility = useCallback(async () => {
    if (!notifyPush) {
      setVisible(false);
      return;
    }

    if (pathname.startsWith("/notifications")) {
      setVisible(false);
      return;
    }

    if (!isPushEnvironmentSupported() || isDevToolsMobileEmulation()) {
      setVisible(false);
      return;
    }

    if (isPushInviteDismissed()) {
      setVisible(false);
      return;
    }

    const diag = await getPushDiagnostics();
    if (!diag.vapidOk || diag.subscribed || diag.permission === "denied") {
      setVisible(false);
      return;
    }

    setVisible(true);
  }, [notifyPush, pathname]);

  useEffect(() => {
    void evaluateVisibility();
  }, [evaluateVisibility]);

  useEffect(() => {
    const onRefresh = () => {
      void evaluateVisibility();
    };
    window.addEventListener("mm:push-invite-refresh", onRefresh);
    return () => window.removeEventListener("mm:push-invite-refresh", onRefresh);
  }, [evaluateVisibility]);

  function handleDismiss() {
    dismissPushInvite();
    setVisible(false);
  }

  async function handleActivate() {
    setLoading(true);
    setError(null);

    const result = await subscribeToPushNotifications();
    setLoading(false);

    if (result.ok) {
      setVisible(false);
      return;
    }

    if (result.blocked) {
      setVisible(false);
      return;
    }

    setError(result.error);
  }

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Invitation aux notifications push"
      className="border-b border-[#f5c2dc]/80 bg-gradient-to-r from-[#fff5f9] via-[#fef7fb] to-[#f8f2fc] px-4 py-2.5 sm:px-6 sm:py-3"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="flex min-w-0 items-center gap-3 sm:items-start">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fce7f3] text-[#e91e8c] sm:h-10 sm:w-10">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#2e1a47]">
              Activez les alertes instantanées
            </p>
            <p className="mt-0.5 hidden text-sm text-[#6b5f7a] sm:block">
              Recevez une popup dès qu&apos;un like, un match ou un message arrive — même hors
              de l&apos;application.
            </p>
            {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 sm:pl-0">
          <Button
            type="button"
            size="sm"
            className="rounded-full"
            onClick={() => void handleActivate()}
            disabled={loading}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Activer les alertes
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full text-[#6b5f7a]"
            onClick={handleDismiss}
            disabled={loading}
          >
            Plus tard
          </Button>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#6b5f7a] hover:bg-black/5"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
