"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GenderPreference } from "@/lib/discover/profile-status";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("last_seen_at")
    .eq("id", user.id)
    .single();

  if (profile?.last_seen_at) {
    const elapsed = Date.now() - new Date(profile.last_seen_at).getTime();
    if (elapsed < 2 * 60 * 1000) return;
  }

  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", user.id);
}
