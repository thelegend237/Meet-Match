"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function confirmRegistrationPayment() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase.rpc("confirm_registration_payment");

  if (error) return { error: error.message };

  revalidatePath("/paiements");
  revalidatePath("/decouvrir");
  revalidatePath("/tableau-de-bord");
  revalidatePath("/profil");
  return { success: true };
}
