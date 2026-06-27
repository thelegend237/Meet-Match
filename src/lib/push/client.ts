const SW_URL = "/sw.js";
const SW_SCOPE = "/";

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
