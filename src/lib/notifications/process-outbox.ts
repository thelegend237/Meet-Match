import { createAdminClient, tryCreateAdminClient } from "@/lib/supabase/admin";
import { sendNotificationEmail } from "@/lib/email/notification";
import { sendPushToUser } from "@/lib/push/send";
import { getNotificationHref } from "@/lib/notifications/display";
import type { Notification } from "@/lib/types/database";

const BATCH_SIZE = 25;

type OutboxRow = {
  id: string;
  notification_id: string;
  delivered_at: string | null;
};

async function getAdmin() {
  const admin = tryCreateAdminClient();
  if (!admin) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante");
  return admin;
}

async function loadNotification(notificationId: string) {
  const admin = await getAdmin();
  const { data, error } = await admin
    .from("notifications")
    .select("*")
    .eq("id", notificationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Notification | null;
}

async function loadUserDeliveryProfile(userId: string) {
  const admin = await getAdmin();
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, display_name, notify_email, notify_push, role, is_deleted")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as {
    id: string;
    email: string;
    display_name: string;
    notify_email: boolean;
    notify_push: boolean;
    role: string;
    is_deleted: boolean;
  } | null;
}

export async function deliverNotification(notification: Notification) {
  const profile = await loadUserDeliveryProfile(notification.user_id);
  if (!profile || profile.is_deleted) {
    return { skipped: true as const };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const isAdmin = profile.role === "admin" || profile.role === "superadmin";
  const href = getNotificationHref(notification, { isAdmin });
  const actionUrl = href ? `${appUrl}${href}` : `${appUrl}/notifications`;

  const results: string[] = [];

  if (profile.notify_email && profile.email) {
    try {
      await sendNotificationEmail({
        to: profile.email,
        displayName: profile.display_name || "Membre",
        title: notification.title,
        content: notification.content,
        actionUrl,
      });
      results.push("email");
    } catch (err) {
      const message = err instanceof Error ? err.message : "email failed";
      results.push(`email_error:${message}`);
    }
  }

  if (profile.notify_push) {
    try {
      const sent = await sendPushToUser(profile.id, {
        title: notification.title,
        body: notification.content,
        url: actionUrl,
      });
      if (sent > 0) results.push(`push:${sent}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "push failed";
      results.push(`push_error:${message}`);
    }
  }

  return { skipped: false as const, results };
}

export async function processOutboxItem(outboxId: string) {
  const admin = await getAdmin();

  const { data: outbox, error: outboxError } = await admin
    .from("notification_outbox")
    .select("id, notification_id, delivered_at")
    .eq("id", outboxId)
    .maybeSingle();

  if (outboxError) throw new Error(outboxError.message);
  if (!outbox) return { ok: false, error: "outbox_not_found" };
  if ((outbox as OutboxRow).delivered_at) return { ok: true, already: true };

  const notification = await loadNotification((outbox as OutboxRow).notification_id);
  if (!notification) {
    await admin
      .from("notification_outbox")
      .update({ delivered_at: new Date().toISOString(), last_error: "notification_missing" })
      .eq("id", outboxId);
    return { ok: false, error: "notification_missing" };
  }

  let lastError: string | null = null;

  try {
    const result = await deliverNotification(notification);
    if (!result.skipped && result.results.some((r) => r.includes("error"))) {
      lastError = result.results.filter((r) => r.includes("error")).join("; ");
    }
  } catch (err) {
    lastError = err instanceof Error ? err.message : "delivery_failed";
  }

  await admin
    .from("notification_outbox")
    .update({
      delivered_at: new Date().toISOString(),
      last_error: lastError,
    })
    .eq("id", outboxId);

  return { ok: !lastError, error: lastError ?? undefined };
}

export async function processPendingOutbox(limit = BATCH_SIZE) {
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("notification_outbox")
    .select("id")
    .is("delivered_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!rows?.length) return { processed: 0 };

  let processed = 0;
  for (const row of rows) {
    await processOutboxItem(row.id as string);
    processed++;
  }

  return { processed };
}
