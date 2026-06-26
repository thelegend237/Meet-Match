import webpush from "web-push";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

type PushPayload = {
  title: string;
  body: string;
  url: string;
};

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "mailto:contact@meet-and-match.app";

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!configureWebPush()) {
    console.warn("[push] Clés VAPID absentes — push non envoyé");
    return 0;
  }

  const admin = tryCreateAdminClient();
  if (!admin) return 0;

  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  if (!subscriptions?.length) return 0;

  const body = JSON.stringify(payload);
  let sent = 0;
  const staleIds: string[] = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint as string,
          keys: {
            p256dh: sub.p256dh as string,
            auth: sub.auth as string,
          },
        },
        body
      );
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        staleIds.push(sub.id as string);
      } else {
        console.error("[push] send failed:", err);
      }
    }
  }

  if (staleIds.length) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  return sent;
}

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || process.env.VAPID_PUBLIC_KEY?.trim() || null;
}
