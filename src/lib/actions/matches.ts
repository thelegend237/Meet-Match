"use server";

import { revalidatePath } from "next/cache";
import { startMatchingCheckout } from "@/lib/actions/payments";
import type { PaymentMethodId } from "@/lib/payments/providers";

export async function confirmMatchingPayment(
  paymentId: string,
  options?: { method?: PaymentMethodId }
) {
  const result = await startMatchingCheckout(paymentId, options);
  if ("error" in result && result.error) return { error: result.error };
  if ("url" in result && result.url) {
    return { url: result.url };
  }
  revalidatePath("/matchs");
  revalidatePath("/notifications");
  revalidatePath("/paiements");
  return { success: true };
}
