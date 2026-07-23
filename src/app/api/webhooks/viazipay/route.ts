import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { markPaymentPaid } from "@/lib/payments/mark-paid";
import {
  isViaziPayStatusSuccessful,
  parseViaziPayOrderId,
} from "@/lib/payments/viazipay";

export const runtime = "nodejs";

/** Ping disponibilité (ViaziPay / health). */
export async function GET() {
  return NextResponse.json({ ok: true });
}

async function resolvePaymentId(orderId: string): Promise<string | null> {
  const fromOrder = parseViaziPayOrderId(orderId);
  if (fromOrder) return fromOrder;

  const admin = createAdminClient();
  const { data } = await admin
    .from("payments")
    .select("id")
    .eq("provider_reference", orderId)
    .maybeSingle();

  return data?.id ?? null;
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown> = {};

  try {
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = (await request.json()) as Record<string, unknown>;
    } else {
      const form = await request.formData();
      for (const [key, value] of form.entries()) {
        if (typeof value === "string") payload[key] = value;
      }
    }
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const orderId = String(payload.order_id ?? "").trim();
  const status = String(payload.status ?? "").trim();

  if (!orderId) {
    return NextResponse.json({ received: true });
  }

  try {
    if (!isViaziPayStatusSuccessful(status)) {
      return NextResponse.json({ received: true, status });
    }

    const paymentId = await resolvePaymentId(orderId);
    if (!paymentId) {
      console.error("[viazipay webhook] paiement introuvable pour", orderId);
      return NextResponse.json({ received: true });
    }

    const txnRef =
      String(payload.txnid ?? payload.payToken ?? orderId).trim() || orderId;

    await markPaymentPaid({
      paymentId,
      provider: "viazipay",
      providerReference: txnRef,
    });
  } catch (err) {
    console.error("[viazipay webhook] handler:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur webhook" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
