import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

/** Expire les essais gratuits de 14 jours terminés. */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("expire_user_trials");
    if (error) {
      throw new Error(error.message);
    }
    return NextResponse.json({
      ok: true,
      expired: typeof data === "number" ? data : Number(data) || 0,
    });
  } catch (err) {
    console.error("[cron/expire-trials]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
