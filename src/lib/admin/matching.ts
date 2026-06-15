import { createClient } from "@/lib/supabase/server";
import type {
  AdminCompareProfile,
  AdminUserListItem,
  MatchProposalPair,
  MatchProposalSource,
} from "@/lib/types/database";
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

function buildPair(
  profileById: Map<string, AdminCompareProfile>,
  userAId: string,
  userBId: string,
  source: MatchProposalSource,
  extras?: Pick<
    MatchProposalPair,
    "signalAt" | "likedByUserId" | "likedToUserId"
  >
): MatchProposalPair | null {
  const profileA = profileById.get(userAId);
  const profileB = profileById.get(userBId);
  if (!profileA || !profileB) return null;

  return {
    userAId,
    userBId,
    userAName: profileA.display_name || profileA.email,
    userBName: profileB.display_name || profileB.email,
    profileA,
    profileB,
    source,
    ...extras,
  };
}

export async function buildMatchProposalPair(
  userAId: string,
  userBId: string,
  source: MatchProposalSource = "manual",
  extras?: Pick<
    MatchProposalPair,
    "signalAt" | "likedByUserId" | "likedToUserId"
  >
): Promise<MatchProposalPair | null> {
  if (userAId === userBId) return null;

  const supabase = await createClient();
  const existingPairs = await getExistingMatchPairKeys(supabase);
  if (existingPairs.has(matchPairKey(userAId, userBId))) return null;

  const profileById = await loadProfilesWithPhotos(supabase, [userAId, userBId]);
  return buildPair(profileById, userAId, userBId, source, extras);
}

export async function getMutualLikePairs(): Promise<MatchProposalPair[]> {
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
    .map((ml) =>
      buildPair(profileById, ml.user_a_id, ml.user_b_id, "mutual", {
        signalAt: ml.mutual_at,
      })
    )
    .filter(Boolean) as MatchProposalPair[];
}

/** @deprecated Utiliser getMutualLikePairs */
export const getMutualLikes = getMutualLikePairs;

export async function getOneWayLikePairs(): Promise<MatchProposalPair[]> {
  const supabase = await createClient();

  const [{ data: likes }, existingPairs] = await Promise.all([
    supabase
      .from("likes")
      .select("from_user_id, to_user_id, created_at")
      .order("created_at", { ascending: false }),
    getExistingMatchPairKeys(supabase),
  ]);

  if (!likes?.length) return [];

  const likeKeys = new Set(
    likes.map((l) => `${l.from_user_id}:${l.to_user_id}`)
  );

  const oneWay = likes.filter((l) => {
    const reverse = `${l.to_user_id}:${l.from_user_id}`;
    if (likeKeys.has(reverse)) return false;
    return !existingPairs.has(matchPairKey(l.from_user_id, l.to_user_id));
  });

  const userIds = [
    ...new Set(oneWay.flatMap((l) => [l.from_user_id, l.to_user_id])),
  ];

  const profileById = await loadProfilesWithPhotos(supabase, userIds);

  return oneWay
    .map((l) =>
      buildPair(profileById, l.from_user_id, l.to_user_id, "one_way", {
        signalAt: l.created_at,
        likedByUserId: l.from_user_id,
        likedToUserId: l.to_user_id,
      })
    )
    .filter(Boolean) as MatchProposalPair[];
}

export async function getMatchingCandidateById(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, display_name, email, primary_photo_url, city, country_code, status"
    )
    .eq("id", userId)
    .eq("role", "user")
    .eq("is_deleted", false)
    .maybeSingle();

  return data;
}

export async function searchMatchingCandidates(
  query: string,
  excludeUserId?: string
): Promise<Pick<AdminUserListItem, "id" | "display_name" | "email" | "primary_photo_url" | "city" | "country_code" | "status">[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const supabase = await createClient();
  const pattern = `%${trimmed.replace(/[%_]/g, "")}%`;

  let q = supabase
    .from("profiles")
    .select(
      "id, display_name, email, primary_photo_url, city, country_code, status"
    )
    .eq("role", "user")
    .eq("is_deleted", false)
    .eq("status", "active")
    .or(`display_name.ilike.${pattern},email.ilike.${pattern}`)
    .order("display_name")
    .limit(12);

  if (excludeUserId) {
    q = q.neq("id", excludeUserId);
  }

  const { data } = await q;
  return data ?? [];
}
