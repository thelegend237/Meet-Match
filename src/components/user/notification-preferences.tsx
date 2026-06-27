"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Bell, BellOff, CheckCircle2, Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateNotificationPreferences } from "@/lib/actions/notification-preferences";
import {
  ensurePushServiceWorker,
  getPushDiagnostics,
  isDevToolsMobileEmulation,
  isPushEnvironmentSupported,
} from "@/lib/push/client";

const SITE_ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://meet-and-match.vercel.app";

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

function permissionLabel(permission: NotificationPermission | "unsupported") {
  if (permission === "granted") return "Autorisées";
  if (permission === "denied") return "Bloquées";
  if (permission === "default") return "Pas encore demandées";
  return "Non supportées";
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
  const [devToolsWarning, setDevToolsWarning] = useState(false);
  const [vapidOk, setVapidOk] = useState<boolean | null>(null);
  const [swState, setSwState] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
    setDevToolsWarning(isDevToolsMobileEmulation());

    if (!isPushEnvironmentSupported()) return;

    const diag = await getPushDiagnostics();
    setVapidOk(diag.vapidOk);
    setSwState(diag.serviceWorkerState);
    setSubscribed(diag.subscribed);
    setPermission(diag.permission);
    setDevToolsWarning(diag.devToolsMobile);
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus, notifyPush]);

  async function requestBrowserPermission() {
    setError(null);
    setLoading(true);

    try {
      if (!isPushEnvironmentSupported()) {
        throw new Error(
          "Utilisez Chrome ou Edge sur ordinateur, en fenêtre normale (fermez le mode mobile F12)."
        );
      }
      if (isDevToolsMobileEmulation()) {
        throw new Error(
          "Fermez le mode mobile des outils développeur (F12), rechargez la page, puis réessayez."
        );
      }

      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === "denied") {
        throw new Error("blocked");
      }
      if (result !== "granted") {
        throw new Error("Autorisation refusée.");
      }

      await ensurePushServiceWorker();
      await refreshStatus();
    } catch (err) {
      if (err instanceof Error && err.message === "blocked") {
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      }
    } finally {
      setLoading(false);
    }
  }

  async function activatePushSubscription() {
    setError(null);
    setLoading(true);

    try {
      if (Notification.permission !== "granted") {
        throw new Error("Autorisez d'abord les notifications du navigateur (étape 1).");
      }

      const keyRes = await fetch("/api/push/vapid-key");
      if (!keyRes.ok) {
        throw new Error("Serveur push non configuré. Contactez le support.");
      }
      const { publicKey } = (await keyRes.json()) as { publicKey: string };

      const registration = await ensurePushServiceWorker();
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
        const msg = data.error || "Enregistrement impossible.";
        if (/relation.*does not exist|push_subscriptions/i.test(msg)) {
          throw new Error(
            "La base de données n'est pas à jour. Appliquez la migration 033 sur Supabase."
          );
        }
        throw new Error(msg);
      }

      setSubscribed(true);
      await refreshStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      if (/permission denied|registration failed/i.test(message)) {
        setPermission("denied");
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function testBrowserNotification() {
    if (Notification.permission !== "granted") return;
    new Notification("Meet & Match — test", {
      body: "Si vous voyez ceci, les notifications navigateur fonctionnent.",
      icon: "/logo-icon.png",
    });
  }

  async function disablePush() {
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
      await refreshStatus();
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

  const permissionGranted = permission === "granted";
  const permissionDenied = permission === "denied";

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fce7f3]/70 text-[#e91e8c]">
          {subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#2e1a47]">Notifications navigateur</p>
          <p className="mt-1 text-sm text-[#6b5f7a]">
            Alertes sur votre appareil même application fermée. Les popups dans l&apos;app
            fonctionnent déjà sans cette étape.
          </p>
        </div>
      </div>

      {devToolsWarning ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <strong>Mode test mobile détecté (F12).</strong> Fermez les outils développeur ou
          désactivez l&apos;émulation mobile, puis rechargez la page.
        </div>
      ) : null}

      <div className="rounded-xl border border-[#ebe6f0]/90 bg-[#faf8fc]/80 px-3 py-3 text-xs text-[#6b5f7a] space-y-1">
        <p>
          <strong>Permission :</strong> {permissionLabel(permission)}
        </p>
        <p>
          <strong>Service worker :</strong> {swState ?? "—"}
        </p>
        <p>
          <strong>Serveur push :</strong>{" "}
          {vapidOk === null ? "—" : vapidOk ? "OK" : "Non configuré"}
        </p>
        <p>
          <strong>Abonnement :</strong> {subscribed ? "Actif" : "Inactif"}
        </p>
      </div>

      {permissionDenied ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 space-y-2">
          <p className="font-semibold">Notifications bloquées — procédure Chrome / Edge</p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>
              Ouvrez{" "}
              <a
                className="font-medium text-[#e91e8c] underline"
                href={`chrome://settings/content/siteDetails?site=${encodeURIComponent(SITE_ORIGIN)}`}
                target="_blank"
                rel="noreferrer"
              >
                les paramètres du site
              </a>{" "}
              (ou cliquez le cadenas à gauche de l&apos;URL → Paramètres du site)
            </li>
            <li>
              <strong>Notifications</strong> → choisissez <strong>Autoriser</strong>
            </li>
            <li>Rechargez cette page (Ctrl+F5)</li>
            <li>Cliquez <strong>Étape 1 — Autoriser le navigateur</strong></li>
          </ol>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-medium text-[#2e1a47]">Activation en 2 étapes</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {!permissionGranted ? (
              <Button type="button" onClick={requestBrowserPermission} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Étape 1 — Autoriser le navigateur
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Étape 1 OK
              </span>
            )}

            {permissionGranted && !subscribed ? (
              <Button type="button" onClick={activatePushSubscription} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Étape 2 — Activer les alertes push
              </Button>
            ) : null}

            {permissionGranted ? (
              <Button type="button" variant="outline" size="sm" onClick={testBrowserNotification}>
                Tester une notification
              </Button>
            ) : null}

            {subscribed ? (
              <Button type="button" variant="outline" onClick={disablePush} disabled={loading}>
                Désactiver sur cet appareil
              </Button>
            ) : null}

            <Button type="button" variant="ghost" size="sm" onClick={() => void refreshStatus()}>
              <RefreshCw className="mr-1 h-4 w-4" />
              Actualiser
            </Button>
          </div>
        </div>
      )}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {subscribed ? (
        <p className="text-sm text-emerald-700">
          Notifications push activées sur cet appareil.
        </p>
      ) : null}
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
              Alertes sur téléphone ou ordinateur, même hors de l&apos;application.
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
