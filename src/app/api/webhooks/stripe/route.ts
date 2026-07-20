import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { markPaymentPaid } from "@/lib/payments/mark-paid";

export const runtime = "nodejs";

async function markPaid(paymentId: string, sessionId: string) {
  await markPaymentPaid({
    paymentId,
    provider: "stripe",
    providerReference: sessionId,
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET manquant" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Signature manquante" }, { status: 400 });
  }

  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Signature invalide";
    console.error("[stripe webhook]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.payment_id;
      if (session.payment_status === "paid" && paymentId) {
        await markPaid(paymentId, session.id);
      }
    }

    if (event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.payment_id;
      if (paymentId) {
        await markPaid(paymentId, session.id);
      }
    }

    if (event.type === "checkout.session.async_payment_failed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.payment_id;
      if (paymentId) {
        const admin = createAdminClient();
        await admin
          .from("payments")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", paymentId)
          .eq("status", "unpaid");
      }
    }
  } catch (err) {
    console.error("[stripe webhook] handler:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur webhook" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
