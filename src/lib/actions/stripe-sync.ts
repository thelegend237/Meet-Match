"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

/** Après retour Stripe : synchronise le paiement si le webhook n'a pas encore tourné. */
export async function syncStripeCheckoutSession(sessionId: string) {
  if (!isStripeConfigured() || !sessionId) {
    return { error: "Stripe non configuré" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const session = await getStripe().checkout.sessions.retrieve(sessionId);
  if (session.payment_status !== "paid") {
    return { pending: true as const };
  }

  const paymentId = session.metadata?.payment_id;
  if (!paymentId) return { error: "Métadonnées manquantes" };

  const { data: payment } = await supabase
    .from("payments")
    .select("id, user_id, status")
    .eq("id", paymentId)
    .single();

  if (!payment || payment.user_id !== user.id) {
    return { error: "Paiement introuvable" };
  }

  if (payment.status === "paid" || payment.status === "free") {
    return { success: true as const };
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc("mark_payment_paid_from_stripe", {
      p_payment_id: paymentId,
      p_stripe_session_id: session.id,
    });
    if (error) {
      await admin
        .from("payments")
        .update({
          status: "paid",
          provider: "stripe",
          stripe_session_id: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", paymentId);
    }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Synchronisation impossible",
    };
  }

  revalidatePath("/paiements");
  revalidatePath("/matchs");
  revalidatePath("/decouvrir");
  revalidatePath("/profil");
  return { success: true as const };
}
