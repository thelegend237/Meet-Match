"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { startMatchingCheckout } from "@/lib/actions/payments";

export async function confirmMatchingPayment(paymentId: string) {
  const result = await startMatchingCheckout(paymentId);
  if ("error" in result && result.error) return { error: result.error };
  if ("url" in result && result.url) {
    return { url: result.url };
  }
  revalidatePath("/matchs");
  revalidatePath("/notifications");
  revalidatePath("/paiements");
  return { success: true };
}
