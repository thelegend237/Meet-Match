const SW_URL = "/sw.js";
const SW_SCOPE = "/";

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
