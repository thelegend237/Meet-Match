"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, hasPlatformAccess } from "@/lib/auth/session";
import { SUBSCRIPTION_REQUIRED_ERROR } from "@/lib/discover/subscription";
import { getDiscoveryExcludedUserIds } from "@/lib/matches/exclusions";
import type { DiscoveryProfile } from "@/lib/types/database";

export async function likeProfile(toUserId: string) {
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
    return { error: "Vous ne pouvez pas liker votre propre profil." };
  }

  const excluded = await getDiscoveryExcludedUserIds(supabase, user.id);
  if (excluded.has(toUserId)) {
    return { error: "Une mise en relation existe déjà avec ce profil." };
  }

  const { error } = await supabase.from("likes").insert({
    from_user_id: user.id,
    to_user_id: toUserId,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Vous avez déjà liké ce profil." };
    }
    return { error: error.message };
  }

  revalidatePath("/decouvrir");
  revalidatePath("/decouvrir/likes");
  revalidatePath("/rencontres");
  return { success: true, message: "Votre intérêt a été enregistré." };
}

export async function getMyLikedIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("likes")
    .select("to_user_id")
    .eq("from_user_id", user.id);

  return data?.map((l) => l.to_user_id) ?? [];
}

export async function getMyLikedProfiles(): Promise<
  Array<DiscoveryProfile & { liked_at: string }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: likes } = await supabase
    .from("likes")
    .select("to_user_id, created_at")
    .eq("from_user_id", user.id)
    .order("created_at", { ascending: false });

  if (!likes?.length) return [];

  const ids = likes.map((l) => l.to_user_id);
  const likedAtById = new Map(likes.map((l) => [l.to_user_id, l.created_at]));

  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      `id, display_name, date_of_birth, country_code, city, language,
       primary_photo_url, bio, gender, expectations, relationship_type,
       created_at, is_verified, last_seen_at`
    )
    .in("id", ids)
    .eq("is_deleted", false);

  if (!profiles?.length) return [];

  const { data: allPhotos } = await supabase
    .from("profile_photos")
    .select("profile_id, url, sort_order")
    .in("profile_id", ids)
    .order("sort_order");

  const photosByProfile = (allPhotos ?? []).reduce<Record<string, string[]>>(
    (acc, ph) => {
      if (!acc[ph.profile_id]) acc[ph.profile_id] = [];
      acc[ph.profile_id].push(ph.url);
      return acc;
    },
    {}
  );

  const orderIndex = new Map(ids.map((id, i) => [id, i]));

  return profiles
    .map((p) => ({
      ...p,
      is_verified: p.is_verified ?? false,
      liked_at: likedAtById.get(p.id) ?? "",
      photos:
        photosByProfile[p.id]?.length > 0
          ? photosByProfile[p.id]
          : p.primary_photo_url
            ? [p.primary_photo_url]
            : [],
    }))
    .sort(
      (a, b) =>
        (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0)
    ) as Array<DiscoveryProfile & { liked_at: string }>;
}
