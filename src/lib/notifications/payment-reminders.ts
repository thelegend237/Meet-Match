import { createAdminClient } from "@/lib/supabase/admin";
import { processPendingOutbox } from "@/lib/notifications/process-outbox";

const DEFAULT_INTERVAL_DAYS = 3;
const DEFAULT_ADMIN_STALE_DAYS = 7;
const DEFAULT_ADMIN_INTERVAL_DAYS = 7;

export async function processAutomaticPaymentReminders(options?: {
  intervalDays?: number;
  adminStaleDays?: number;
  adminIntervalDays?: number;
  deliver?: boolean;
}) {
  const intervalDays = options?.intervalDays ?? DEFAULT_INTERVAL_DAYS;
  const adminStaleDays = options?.adminStaleDays ?? DEFAULT_ADMIN_STALE_DAYS;
  const adminIntervalDays = options?.adminIntervalDays ?? DEFAULT_ADMIN_INTERVAL_DAYS;
  const deliver = options?.deliver ?? true;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("process_automatic_payment_reminders", {
    p_min_interval: `${intervalDays} days`,
    p_admin_stale_age: `${adminStaleDays} days`,
    p_admin_min_interval: `${adminIntervalDays} days`,
  });

  if (error) {
    throw new Error(error.message);
  }

  const reminders = (data ?? {}) as {
    matching_reminders_sent?: number;
    registration_reminders_sent?: number;
    admin_registration_alerts_sent?: number;
    min_interval?: string;
    admin_stale_age?: string;
    admin_min_interval?: string;
  };

  const delivery = deliver ? await processPendingOutbox() : null;

  return {
    reminders,
    delivery,
  };
}
