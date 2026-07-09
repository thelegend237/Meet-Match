import { NextResponse } from "next/server";
import { processEngagementReminders } from "@/lib/notifications/engagement-reminders";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

/** Relances rétention : profil incomplet, likes en attente, match partenaire. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const result = await processEngagementReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/engagement-reminders]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
