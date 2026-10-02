import { NextResponse } from "next/server";
import { sendDailyCommunityNote } from "@/lib/notifications/send-community-note";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

/** Un message chaleureux par jour pour les membres actifs. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const result = await sendDailyCommunityNote();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/community-note]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
