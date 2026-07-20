import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { markPaymentPaid } from "@/lib/payments/mark-paid";
import {
  capturePayPalOrder,
  extractPaymentIdFromPayPalOrder,
  getPayPalOrder,
  verifyPayPalWebhookSignature,
} from "@/lib/payments/paypal";

export const runtime = "nodejs";

interface PayPalWebhookEvent {
  id?: string;
  event_type?: string;
  resource?: {
    id?: string;
    status?: string;
    supplementary_data?: {
      related_ids?: { order_id?: string };
    };
    purchase_units?: Array<{
      custom_id?: string;
      reference_id?: string;
      payments?: {
        captures?: Array<{ id: string; status: string }>;
      };
    }>;
  };
}

async function findPaymentId(params: {
  orderId?: string | null;
  captureId?: string | null;
  customId?: string | null;
}): Promise<string | null> {
  if (params.customId) return params.customId;

  const admin = createAdminClient();

  if (params.orderId) {
    const { data } = await admin
      .from("payments")
      .select("id")
      .eq("provider_reference", params.orderId)
      .maybeSingle();
    if (data?.id) return data.id;

    try {
      const order = await getPayPalOrder(params.orderId);
      const fromOrder = extractPaymentIdFromPayPalOrder(order);
      if (fromOrder) return fromOrder;
    } catch (err) {
      console.error("[paypal webhook] get order:", err);
    }
  }

  if (params.captureId) {
    const { data } = await admin
      .from("payments")
      .select("id")
      .eq("provider_reference", params.captureId)
      .maybeSingle();
    if (data?.id) return data.id;
  }

  return null;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  let event: PayPalWebhookEvent;

  try {
    event = JSON.parse(body) as PayPalWebhookEvent;
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const valid = await verifyPayPalWebhookSignature({
    headers: request.headers,
    body,
    event,
  });
  if (!valid) {
    return NextResponse.json({ error: "Signature invalide" }, { status: 400 });
  }

  try {
    const eventType = event.event_type;

    if (eventType === "CHECKOUT.ORDER.APPROVED") {
      const orderId = event.resource?.id;
      if (!orderId) {
        return NextResponse.json({ received: true });
      }

      const captured = await capturePayPalOrder(orderId);
      const paymentId =
        extractPaymentIdFromPayPalOrder(captured) ||
        (await findPaymentId({ orderId }));

      if (paymentId && captured.status === "COMPLETED") {
        const captureRef =
          captured.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderId;
        await markPaymentPaid({
          paymentId,
          provider: "paypal",
          providerReference: captureRef,
        });
      }
    }

    if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
      const captureId = event.resource?.id;
      const orderId =
        event.resource?.supplementary_data?.related_ids?.order_id ?? null;
      const customId =
        event.resource?.purchase_units?.[0]?.custom_id ||
        event.resource?.purchase_units?.[0]?.reference_id ||
        null;

      const paymentId = await findPaymentId({
        orderId,
        captureId: captureId ?? null,
        customId,
      });

      if (paymentId) {
        await markPaymentPaid({
          paymentId,
          provider: "paypal",
          providerReference: captureId || orderId || paymentId,
        });
      }
    }
  } catch (err) {
    console.error("[paypal webhook] handler:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur webhook" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
