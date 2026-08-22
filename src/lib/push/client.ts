const SW_URL = "/sw.js";
const SW_SCOPE = "/";
const PUSH_INVITE_DISMISS_KEY = "mm:push-invite-dismissed-at";
export const PUSH_INVITE_DISMISS_DAYS = 7;

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

export function isPushEnvironmentSupported() {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;
  if (!("Notification" in window)) return false;
  if (!window.isSecureContext) return false;
  return true;
}

export function isDevToolsMobileEmulation() {
  if (typeof window === "undefined") return false;
  const narrow = window.matchMedia("(max-width: 768px)").matches;
  const desktopUa = /Windows|Macintosh|Linux/i.test(navigator.userAgent);
  return desktopUa && narrow && window.outerWidth > 500;
}

/** Enregistre le SW et attend qu'il soit actif (requis avant pushManager.subscribe). */
export async function ensurePushServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service worker non supporté sur cet appareil.");
  }

  let registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);

  if (!registration) {
    registration = await navigator.serviceWorker.register(SW_URL, {
      scope: SW_SCOPE,
      updateViaCache: "none",
    });
  }

  if (registration.active) {
    return registration;
  }

  await new Promise<void>((resolve, reject) => {
    const worker = registration!.installing ?? registration!.waiting;
    if (!worker) {
      navigator.serviceWorker.ready.then(() => resolve()).catch(reject);
      return;
    }

    const onStateChange = () => {
      if (worker.state === "activated") {
        worker.removeEventListener("statechange", onStateChange);
        resolve();
      } else if (worker.state === "redundant") {
        worker.removeEventListener("statechange", onStateChange);
        reject(new Error("Échec d'activation du service worker."));
      }
    };

    worker.addEventListener("statechange", onStateChange);

    if (worker.state === "activated") {
      worker.removeEventListener("statechange", onStateChange);
      resolve();
    }
  });

  return navigator.serviceWorker.ready;
}

export async function getPushSubscription() {
  const registration = await navigator.serviceWorker.getRegistration(SW_SCOPE);
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function getPushDiagnostics() {
  const supported = isPushEnvironmentSupported();
  const permission =
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : ("unsupported" as const);
  const devToolsMobile = isDevToolsMobileEmulation();

  let serviceWorkerState: string | null = null;
  let subscribed = false;

  if (supported) {
    try {
      const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
      serviceWorkerState =
        reg?.active?.state ?? reg?.installing?.state ?? reg?.waiting?.state ?? "absent";
      subscribed = Boolean(await reg?.pushManager.getSubscription());
    } catch {
      serviceWorkerState = "error";
    }
  }

  let vapidOk = false;
  try {
    const res = await fetch("/api/push/vapid-key");
    vapidOk = res.ok;
  } catch {
    vapidOk = false;
  }

  return {
    supported,
    permission,
    serviceWorkerState,
    subscribed,
    vapidOk,
    devToolsMobile,
  };
}

export function isPushInviteDismissed() {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(PUSH_INVITE_DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return false;
  const elapsedDays = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return elapsedDays < PUSH_INVITE_DISMISS_DAYS;
}

export function dismissPushInvite() {
  if (typeof window === "undefined") return;
  localStorage.setItem(PUSH_INVITE_DISMISS_KEY, String(Date.now()));
}

/** Réaffiche le bandeau push (ex. après le premier like). */
export function clearPushInviteDismiss() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PUSH_INVITE_DISMISS_KEY);
  window.dispatchEvent(new Event("mm:push-invite-refresh"));
}

export async function requestPushPermission() {
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
  if (result === "denied") {
    throw new Error("blocked");
  }
  if (result !== "granted") {
    throw new Error("Autorisation refusée.");
  }

  await ensurePushServiceWorker();
  return result;
}

export async function subscribeToPushNotifications(): Promise<
  { ok: true } | { ok: false; error: string; blocked?: boolean }
> {
  try {
    if (Notification.permission !== "granted") {
      await requestPushPermission();
    }

    const keyRes = await fetch("/api/push/vapid-key");
    if (!keyRes.ok) {
      return { ok: false, error: "Serveur push non configuré. Contactez le support." };
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
        return {
          ok: false,
          error:
            "La base de données n'est pas à jour. Appliquez la migration 033 sur Supabase.",
        };
      }
      return { ok: false, error: msg };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    if (message === "blocked" || /permission denied|registration failed/i.test(message)) {
      return { ok: false, error: message, blocked: true };
    }
    return { ok: false, error: message };
  }
}
