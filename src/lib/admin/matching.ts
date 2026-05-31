import { createClient } from "@/lib/supabase/server";
import type { AdminCompareProfile, MutualLikePair } from "@/lib/types/database";
import { getExistingMatchPairKeys, matchPairKey } from "@/lib/matches/exclusions";

const PROFILE_FIELDS = `
  id, display_name, email, phone, date_of_birth, gender,
  country_code, city, language, bio, expectations, relationship_type,
  preferred_age_min, preferred_age_max, preferred_country_code,
  preferred_city, preferred_relation_scope, preferred_gender,
  primary_photo_url, is_verified, registration_payment_status,
  profile_completion, status
`;

async function loadProfilesWithPhotos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[]
): Promise<Map<string, AdminCompareProfile>> {
  if (!userIds.length) return new Map();

  const { data: profiles } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .in("id", userIds);

  const { data: allPhotos } = await supabase
    .from("profile_photos")
    .select("profile_id, url, sort_order")
    .in("profile_id", userIds)
    .order("sort_order");

  const photosByProfile = (allPhotos ?? []).reduce<Record<string, string[]>>(
    (acc, ph) => {
      if (!acc[ph.profile_id]) acc[ph.profile_id] = [];
      acc[ph.profile_id].push(ph.url);
      return acc;
    },
    {}
  );

  const map = new Map<string, AdminCompareProfile>();

  for (const p of profiles ?? []) {
    const photos =
      photosByProfile[p.id]?.length > 0
        ? photosByProfile[p.id]
        : p.primary_photo_url
          ? [p.primary_photo_url]
          : [];

    map.set(p.id, {
      ...p,
      is_verified: p.is_verified ?? false,
      preferred_gender: p.preferred_gender ?? null,
      photos,
    } as AdminCompareProfile);
  }

  return map;
}

export async function getMutualLikes(): Promise<MutualLikePair[]> {
  const supabase = await createClient();

  const [{ data: mutualLikes }, existingPairs] = await Promise.all([
    supabase
      .from("mutual_likes")
      .select("user_a_id, user_b_id, mutual_at")
      .order("mutual_at", { ascending: false }),
    getExistingMatchPairKeys(supabase),
  ]);

  if (!mutualLikes?.length) return [];

  const filtered = mutualLikes.filter(
    (ml) => !existingPairs.has(matchPairKey(ml.user_a_id, ml.user_b_id))
  );

  const userIds = [
    ...new Set(filtered.flatMap((ml) => [ml.user_a_id, ml.user_b_id])),
  ];

  const profileById = await loadProfilesWithPhotos(supabase, userIds);

  return filtered
    .map((ml) => {
      const profileA = profileById.get(ml.user_a_id);
      const profileB = profileById.get(ml.user_b_id);
      if (!profileA || !profileB) return null;

      return {
        userAId: ml.user_a_id,
        userBId: ml.user_b_id,
        userAName: profileA.display_name || profileA.email,
        userBName: profileB.display_name || profileB.email,
        mutualAt: ml.mutual_at,
        profileA,
        profileB,
      };
    })
    .filter(Boolean) as MutualLikePair[];
}
