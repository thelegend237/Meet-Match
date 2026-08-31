"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, canBrowseDiscovery } from "@/lib/auth/session";
import { SUBSCRIPTION_REQUIRED_ERROR } from "@/lib/discover/subscription";
import { getDiscoveryExcludedUserIds, userIsLockedAfterMatchSuccess } from "@/lib/matches/exclusions";

export async function passProfile(toUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const profile = await getCurrentProfile();
  // Passer un profil est autorisé en mode parcours (browse-free) ; liker reste payant.
  if (!profile || !canBrowseDiscovery(profile)) {
    return { error: SUBSCRIPTION_REQUIRED_ERROR };
  }

  if (user.id === toUserId) {
    return { error: "Action impossible sur votre propre profil." };
  }

  if (await userIsLockedAfterMatchSuccess(supabase, user.id)) {
    return {
      error:
        "Votre compte est en pause après une mise en relation réussie. Demandez une réactivation à l'équipe pour continuer.",
    };
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

export async function getMyPassedIds(userId?: string): Promise<string[]> {
  const supabase = await createClient();
  let uid = userId;
  if (!uid) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    uid = user.id;
  }

  const { data } = await supabase
    .from("profile_passes")
    .select("to_user_id")
    .eq("from_user_id", uid);

  return data?.map((p) => p.to_user_id) ?? [];
}
