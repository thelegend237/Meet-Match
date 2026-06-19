"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GenderPreference } from "@/lib/discover/profile-status";
import { touchLastSeen as touchLastSeenCore } from "@/lib/user/touch-last-seen";

export async function updatePreferredGender(preference: GenderPreference) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (!["male", "female", "both"].includes(preference)) {
    return { error: "Préférence invalide" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ preferred_gender: preference })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/decouvrir");
  revalidatePath("/profil/modifier");
  return { success: true };
}

export async function touchLastSeen() {
  await touchLastSeenCore();
}
