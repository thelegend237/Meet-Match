import { createAdminClient } from "@/lib/supabase/admin";
import { processPendingOutbox } from "@/lib/notifications/process-outbox";

const DEFAULT_INTERVAL_DAYS = 3;

export async function processAutomaticPaymentReminders(options?: {
  intervalDays?: number;
  deliver?: boolean;
}) {
  const intervalDays = options?.intervalDays ?? DEFAULT_INTERVAL_DAYS;
  const deliver = options?.deliver ?? true;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("process_automatic_payment_reminders", {
    p_min_interval: `${intervalDays} days`,
  });

  if (error) {
    throw new Error(error.message);
  }

  const reminders = (data ?? {}) as {
    matching_reminders_sent?: number;
    registration_reminders_sent?: number;
    min_interval?: string;
  };

  const delivery = deliver ? await processPendingOutbox() : null;

  return {
    reminders,
    delivery,
  };
}
