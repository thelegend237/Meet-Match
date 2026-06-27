import type { Notification } from "@/lib/types/database";

export const NOTIFICATION_INSERT_EVENT = "mm:notification-insert";

export function dispatchNotificationInsert(notification: Notification) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<Notification>(NOTIFICATION_INSERT_EVENT, {
      detail: notification,
    })
  );
}

export function onNotificationInsert(
  handler: (notification: Notification) => void
) {
  if (typeof window === "undefined") return () => undefined;

  const listener = (event: Event) => {
    const custom = event as CustomEvent<Notification>;
    if (custom.detail?.id) handler(custom.detail);
  };

  window.addEventListener(NOTIFICATION_INSERT_EVENT, listener);
  return () => window.removeEventListener(NOTIFICATION_INSERT_EVENT, listener);
}
