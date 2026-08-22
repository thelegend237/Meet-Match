import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processPendingOutbox } from "@/lib/notifications/process-outbox";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

/** Expire les essais terminés + rappels J+7 / J-3 / J-1. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();

    const { data: reminded, error: remindError } = await admin.rpc(
      "process_trial_reminders"
    );
    if (remindError) {
      // Migration 051 pas encore appliquée : on continue l'expiration.
      const missing =
        /Could not find the function|does not exist|schema cache/i.test(
          remindError.message
        );
      if (!missing) {
        throw new Error(remindError.message);
      }
      console.warn(
        "[cron/expire-trials] process_trial_reminders absent — appliquer migration 051"
      );
    }

    const { data: expired, error: expireError } = await admin.rpc(
      "expire_user_trials"
    );
    if (expireError) {
      throw new Error(expireError.message);
    }

    const delivery = await processPendingOutbox();

    return NextResponse.json({
      ok: true,
      trialReminders:
        remindError
          ? 0
          : typeof reminded === "number"
            ? reminded
            : Number(reminded) || 0,
      trialRemindersSkipped: Boolean(remindError),
      expired: typeof expired === "number" ? expired : Number(expired) || 0,
      delivery,
    });
  } catch (err) {
    console.error("[cron/expire-trials]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
