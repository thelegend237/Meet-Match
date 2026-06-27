"use client";

import { useEffect, useState, useTransition } from "react";
import { Bell, BellOff, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateNotificationPreferences } from "@/lib/actions/notification-preferences";
import {
  ensurePushServiceWorker,
  getPushSubscription,
} from "@/lib/push/client";

function pushPermissionDeniedHelp() {
  return (
    "Les notifications sont bloquées pour meet-and-match.vercel.app. " +
    "Cliquez sur l’icône à gauche de l’adresse (cadenas ou réglages) → Notifications → Autoriser, " +
    "puis rechargez la page (Ctrl+F5) et réessayez."
  );
}

function mapPushError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/permission denied|not allowed|registration failed/i.test(message)) {
    return pushPermissionDeniedHelp();
  }
  return message || "Erreur inconnue";
}

function isPushEnvironmentSupported() {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (!window.isSecureContext) return false;
  return true;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

interface PushNotificationManagerProps {
  notifyPush: boolean;
}

export function PushNotificationManager({ notifyPush }: PushNotificationManagerProps) {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  useEffect(() => {
    if (!isPushEnvironmentSupported() || !notifyPush) return;

    let cancelled = false;

    (async () => {
      try {
        await ensurePushServiceWorker();
        const sub = await getPushSubscription();
        if (!cancelled) setSubscribed(Boolean(sub));
      } catch {
        /* ignore — l'utilisateur activera manuellement */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [notifyPush]);

  async function enablePush() {
    if (!isPushEnvironmentSupported()) {
      setError(
        "Les notifications push ne sont pas disponibles ici. Utilisez Chrome ou Edge en fenêtre normale (pas le mode mobile des outils développeur) et une connexion HTTPS."
      );
      return;
    }

    if (Notification.permission === "denied") {
      setPermission("denied");
      setError(pushPermissionDeniedHelp());
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const keyRes = await fetch("/api/push/vapid-key");
      if (!keyRes.ok) {
        throw new Error("Notifications push non configurées sur le serveur.");
      }
      const { publicKey } = (await keyRes.json()) as { publicKey: string };

      if (Notification.permission !== "granted") {
        const permissionResult = await Notification.requestPermission();
        setPermission(permissionResult);
        if (permissionResult !== "granted") {
          throw new Error(pushPermissionDeniedHelp());
        }
      }

      const registration = await ensurePushServiceWorker();

      if (Notification.permission !== "granted") {
        throw new Error(pushPermissionDeniedHelp());
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || "Impossible d'enregistrer l'abonnement push.");
      }

      setSubscribed(true);
      setError(null);
    } catch (err) {
      setError(mapPushError(err));
      if ("Notification" in window) {
        setPermission(Notification.permission);
      }
    } finally {
      setLoading(false);
    }
  }

  async function disablePush() {
    if (!("serviceWorker" in navigator)) return;
    setLoading(true);
    setError(null);

    try {
      const registration = await ensurePushServiceWorker();
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  if (!notifyPush) {
    return (
      <p className="text-sm text-muted-foreground">
        Les notifications push sont désactivées dans vos préférences.
      </p>
    );
  }

  if (permission === "unsupported") {
    return (
      <p className="text-sm text-muted-foreground">
        Votre navigateur ne prend pas en charge les notifications push.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fce7f3]/70 text-[#e91e8c]">
          {subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#2e1a47]">Notifications navigateur</p>
          <p className="mt-1 text-sm text-[#6b5f7a]">
            Recevez une alerte sur votre appareil même lorsque l&apos;application est fermée
            (likes, matchs, messages…).
          </p>
          {permission === "denied" ? (
            <div className="mt-2 space-y-1 text-sm text-amber-800">
              <p className="font-medium">Notifications bloquées par le navigateur</p>
              <p>{pushPermissionDeniedHelp()}</p>
              <p className="text-xs text-amber-700/90">
                Astuce : testez en fenêtre pleine largeur (pas le mode mobile des outils développeur F12).
              </p>
            </div>
          ) : null}
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {!subscribed ? (
          <Button type="button" onClick={enablePush} disabled={loading || permission === "denied"}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Activer les notifications push
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={disablePush} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Désactiver sur cet appareil
          </Button>
        )}
      </div>
    </div>
  );
}

interface NotificationPreferencesFormProps {
  notifyEmail: boolean;
  notifyPush: boolean;
}

export function NotificationPreferencesForm({
  notifyEmail: initialEmail,
  notifyPush: initialPush,
}: NotificationPreferencesFormProps) {
  const [notifyEmail, setNotifyEmail] = useState(initialEmail);
  const [notifyPush, setNotifyPush] = useState(initialPush);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save(next: { notifyEmail?: boolean; notifyPush?: boolean }) {
    const email = next.notifyEmail ?? notifyEmail;
    const push = next.notifyPush ?? notifyPush;
    setNotifyEmail(email);
    setNotifyPush(push);
    setSaved(false);

    startTransition(async () => {
      const result = await updateNotificationPreferences({ notifyEmail: email, notifyPush: push });
      if (!result.error) setSaved(true);
    });
  }

  return (
    <div className="space-y-6">
      <div className="mm-card divide-y divide-[#ebe6f0]/80">
        <label className="flex cursor-pointer items-start gap-3 p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-[#d4c8de] text-[#e91e8c] focus:ring-[#e91e8c]"
            checked={notifyEmail}
            disabled={isPending}
            onChange={(e) => save({ notifyEmail: e.target.checked })}
          />
          <span>
            <span className="flex items-center gap-2 text-sm font-semibold text-[#2e1a47]">
              <Mail className="h-4 w-4 text-[#e91e8c]" />
              Notifications par email
            </span>
            <span className="mt-1 block text-sm text-[#6b5f7a]">
              Recevez un email pour les likes, propositions de match, messages et autres événements.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-[#d4c8de] text-[#e91e8c] focus:ring-[#e91e8c]"
            checked={notifyPush}
            disabled={isPending}
            onChange={(e) => save({ notifyPush: e.target.checked })}
          />
          <span>
            <span className="flex items-center gap-2 text-sm font-semibold text-[#2e1a47]">
              <Bell className="h-4 w-4 text-[#e91e8c]" />
              Notifications push
            </span>
            <span className="mt-1 block text-sm text-[#6b5f7a]">
              Alertes instantanées sur votre téléphone ou ordinateur, même hors de l&apos;application.
            </span>
          </span>
        </label>
      </div>

      {isPending ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Enregistrement…
        </p>
      ) : saved ? (
        <p className="text-sm text-emerald-700">Préférences enregistrées.</p>
      ) : null}

      <PushNotificationManager notifyPush={notifyPush} />
    </div>
  );
}
