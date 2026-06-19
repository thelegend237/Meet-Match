"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPlatformAccess } from "@/lib/auth/session";
import { SUBSCRIPTION_REQUIRED_ERROR } from "@/lib/discover/subscription";
import { getDiscoveryExcludedUserIds } from "@/lib/matches/exclusions";

export async function passProfile(toUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const profile = await getCurrentProfile();
  if (!profile || !hasPlatformAccess(profile)) {
    return { error: SUBSCRIPTION_REQUIRED_ERROR };
  }

  if (user.id === toUserId) {
    return { error: "Action impossible sur votre propre profil." };
  }

  const excluded = await getDiscoveryExcludedUserIds(supabase, user.id);
  if (excluded.has(toUserId)) {
    return { error: "Profil indisponible." };
  }

  const { error } = await supabase.from("profile_passes").insert({
    from_user_id: user.id,
    to_user_id: toUserId,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: true, message: "Profil déjà passé." };
    }
    return { error: error.message };
  }

  revalidatePath("/decouvrir");
  revalidatePath("/rencontres");
  return { success: true };
}

export async function getMyPassedIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("profile_passes")
    .select("to_user_id")
    .eq("from_user_id", user.id);

  return data?.map((p) => p.to_user_id) ?? [];
}
