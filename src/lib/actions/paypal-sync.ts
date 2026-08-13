"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { markPaymentPaid } from "@/lib/payments/mark-paid";
import {
  capturePayPalOrder,
  extractPaymentIdFromPayPalOrder,
  getPayPalOrder,
} from "@/lib/payments/paypal";
import { isPayPalConfigured } from "@/lib/payments/providers";

/** Après retour PayPal : capture l'ordre et marque le paiement si le webhook n'a pas encore tourné. */
export async function syncPayPalCheckoutOrder(orderId: string) {
  if (!isPayPalConfigured() || !orderId?.trim()) {
    return { error: "PayPal non configuré" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  let order;
  try {
    order = await getPayPalOrder(orderId.trim());
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Ordre PayPal introuvable",
    };
  }

  const paymentId = extractPaymentIdFromPayPalOrder(order);
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

  let finalOrder = order;

  if (order.status === "APPROVED") {
    try {
      finalOrder = await capturePayPalOrder(orderId.trim());
    } catch (captureErr) {
      try {
        finalOrder = await getPayPalOrder(orderId.trim());
      } catch {
        return {
          error:
            captureErr instanceof Error
              ? captureErr.message
              : "Capture PayPal impossible",
        };
      }
    }
  }

  if (finalOrder.status !== "COMPLETED") {
    return { pending: true as const };
  }

  const captureRef =
    finalOrder.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderId;

  try {
    await markPaymentPaid({
      paymentId,
      provider: "paypal",
      providerReference: captureRef,
    });
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
