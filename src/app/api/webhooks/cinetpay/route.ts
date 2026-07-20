import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { markPaymentPaid } from "@/lib/payments/mark-paid";
import {
  checkCinetPayPayment,
  isCinetPayPaymentAccepted,
  verifyCinetPayHmac,
} from "@/lib/payments/cinetpay";

export const runtime = "nodejs";

/**
 * CinetPay ping en GET pour vérifier que l'URL est joignable.
 * Doit répondre 200.
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}

function formToRecord(form: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === "string") out[key] = value;
  }
  return out;
}

async function resolvePaymentId(
  transactionId: string,
  metadataRaw?: string | null
): Promise<string | null> {
  if (metadataRaw) {
    try {
      const meta = JSON.parse(metadataRaw) as { payment_id?: string };
      if (meta.payment_id) return meta.payment_id;
    } catch {
      // metadata peut être une chaîne libre
    }
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("payments")
    .select("id")
    .eq("provider_reference", transactionId)
    .maybeSingle();

  return data?.id ?? null;
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") || "";
  let payload: Record<string, string> = {};

  try {
    if (contentType.includes("application/json")) {
      const json = (await request.json()) as Record<string, unknown>;
      for (const [k, v] of Object.entries(json)) {
        if (v != null) payload[k] = String(v);
      }
    } else {
      const form = await request.formData();
      payload = formToRecord(form);
    }
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const transactionId = payload.cpm_trans_id?.trim();
  if (!transactionId) {
    // Ping / payload incomplet — toujours 200 pour éviter les retries inutiles
    return NextResponse.json({ received: true });
  }

  const xToken =
    request.headers.get("x-token") || request.headers.get("X-TOKEN");

  try {
    if (!verifyCinetPayHmac(payload, xToken)) {
      console.error("[cinetpay webhook] HMAC invalide");
      return NextResponse.json({ error: "HMAC invalide" }, { status: 400 });
    }

    const check = await checkCinetPayPayment(transactionId);
    if (!isCinetPayPaymentAccepted(check)) {
      return NextResponse.json({ received: true, status: check.data?.status });
    }

    const paymentId = await resolvePaymentId(
      transactionId,
      check.data?.metadata ?? payload.cpm_custom
    );

    if (!paymentId) {
      console.error(
        "[cinetpay webhook] paiement introuvable pour",
        transactionId
      );
      return NextResponse.json({ received: true });
    }

    await markPaymentPaid({
      paymentId,
      provider: "cinetpay",
      providerReference: transactionId,
    });
  } catch (err) {
    console.error("[cinetpay webhook] handler:", err);
    // CinetPay recommande de répondre 200 pour limiter les retries agressifs
    // après traitement partiel ; on renvoie 500 seulement sur erreur franche.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur webhook" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
