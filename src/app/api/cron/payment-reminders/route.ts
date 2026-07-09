import { NextResponse } from "next/server";
import { processAutomaticPaymentReminders } from "@/lib/notifications/payment-reminders";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

/** Relance automatique des paiements en attente (matching + inscription). */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const result = await processAutomaticPaymentReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/payment-reminders]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
