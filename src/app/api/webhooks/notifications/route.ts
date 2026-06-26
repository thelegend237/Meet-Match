import { NextResponse } from "next/server";
import { processOutboxItem } from "@/lib/notifications/process-outbox";

function isAuthorized(request: Request) {
  const secret = process.env.NOTIFICATION_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const header =
    request.headers.get("x-webhook-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

type WebhookPayload = {
  type?: string;
  table?: string;
  record?: {
    id?: string;
    notification_id?: string;
  };
};

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as WebhookPayload;
    const record = payload.record;

    let outboxId = record?.id;
    if (!outboxId && record?.notification_id) {
      const { createAdminClient } = await import("@/lib/supabase/admin");
      const admin = createAdminClient();
      const { data } = await admin
        .from("notification_outbox")
        .select("id")
        .eq("notification_id", record.notification_id)
        .maybeSingle();
      outboxId = data?.id as string | undefined;
    }

    if (!outboxId) {
      return NextResponse.json({ error: "outbox_id manquant" }, { status: 400 });
    }

    const result = await processOutboxItem(outboxId);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[webhook/notifications]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
