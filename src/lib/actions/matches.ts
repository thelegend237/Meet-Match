"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function confirmMatchingPayment(paymentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase.rpc("confirm_matching_payment", {
    p_payment_id: paymentId,
  });

  if (error) return { error: error.message };

  revalidatePath("/matchs");
  revalidatePath("/notifications");
  revalidatePath("/paiements");
  return { success: true };
}
