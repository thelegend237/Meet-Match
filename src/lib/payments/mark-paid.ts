import { createAdminClient } from "@/lib/supabase/admin";
import type { PaymentProvider } from "@/lib/payments/providers";

/** Marque un paiement payé via RPC générique (service role). */
export async function markPaymentPaid(params: {
  paymentId: string;
  provider: PaymentProvider;
  providerReference: string;
}) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("mark_payment_paid", {
    p_payment_id: params.paymentId,
    p_provider: params.provider,
    p_provider_reference: params.providerReference,
  });

  if (!error) return;

  // Fallback si la migration 047 n'est pas encore appliquée
  const update: Record<string, string> = {
    status: "paid",
    provider: params.provider,
    provider_reference: params.providerReference,
    updated_at: new Date().toISOString(),
  };
  if (params.provider === "stripe") {
    update.stripe_session_id = params.providerReference;
  }

  const { error: updateError } = await admin
    .from("payments")
    .update(update)
    .eq("id", params.paymentId)
    .in("status", ["unpaid", "failed"]);

  if (updateError) {
    throw new Error(error.message || updateError.message);
  }
}
