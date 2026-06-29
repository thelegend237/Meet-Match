import type { createClient } from "@/lib/supabase/server";
import type { DiscoveryProfile } from "@/lib/types/database";
import { getProfileLanguages } from "@/lib/languages";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

type DiscoverProfileRow = {
  id: string;
  display_name: string;
  date_of_birth: string | null;
  country_code: string | null;
  city: string | null;
  language: string | null;
  languages?: string[] | null;
  primary_photo_url: string | null;
  bio: string | null;
  gender: DiscoveryProfile["gender"];
  expectations: string | null;
  relationship_type: DiscoveryProfile["relationship_type"];
  created_at: string | null;
  is_verified: boolean | null;
  last_seen_at: string | null;
  latitude: number | null;
  longitude: number | null;
  distance_km?: number | string | null;
};

const DISCOVERY_LIMIT = 1000;

const DISCOVERY_SELECT = `
  id, display_name, date_of_birth, country_code, city, language,
  primary_photo_url, bio, gender, expectations, relationship_type,
  created_at, is_verified, last_seen_at, latitude, longitude
`;

function mapDiscoveryProfile(
  p: DiscoverProfileRow,
  photosByProfile: Record<string, string[]>
): DiscoveryProfile {
  return {
    id: p.id,
    display_name: p.display_name,
    date_of_birth: p.date_of_birth,
    country_code: p.country_code,
    city: p.city,
    language: p.language,
    languages: getProfileLanguages(p),
    primary_photo_url: p.primary_photo_url,
    bio: p.bio,
    gender: p.gender,
    expectations: p.expectations,
    relationship_type: p.relationship_type,
    created_at: p.created_at,
    is_verified: p.is_verified ?? false,
    last_seen_at: p.last_seen_at,
    latitude: p.latitude,
    longitude: p.longitude,
    distance_km:
      p.distance_km === null || p.distance_km === undefined
        ? null
        : Number(p.distance_km),
    photos:
      photosByProfile[p.id]?.length > 0
        ? photosByProfile[p.id]
        : p.primary_photo_url
          ? [p.primary_photo_url]
          : [],
  };
}

async function attachPhotos(
  supabase: SupabaseServer,
  profiles: DiscoverProfileRow[]
): Promise<DiscoveryProfile[]> {
  if (profiles.length === 0) return [];

  const profileIds = profiles.map((p) => p.id);
  const { data: allPhotos } = await supabase
    .from("profile_photos")
    .select("profile_id, url, sort_order")
    .in("profile_id", profileIds)
    .order("sort_order");

  const photosByProfile = (allPhotos ?? []).reduce<Record<string, string[]>>(
    (acc, ph) => {
      if (!acc[ph.profile_id]) acc[ph.profile_id] = [];
      acc[ph.profile_id].push(ph.url);
      return acc;
    },
    {}
  );

  return profiles.map((p) => mapDiscoveryProfile(p, photosByProfile));
}

function hasVisiblePhoto(
  profile: DiscoveryProfile | DiscoverProfileRow,
  photosByProfile?: Record<string, string[]>
): boolean {
  if (profile.primary_photo_url?.trim()) return true;
  if (photosByProfile && photosByProfile[profile.id]?.length > 0) return true;
  if ("photos" in profile && (profile.photos?.length ?? 0) > 0) return true;
  return false;
}

export async function loadDiscoveryProfiles(
  supabase: SupabaseServer,
  excludedUserIds: Set<string>,
  viewerId?: string
): Promise<DiscoveryProfile[]> {
  const { data: rows, error } = await supabase.rpc("discover_profiles", {
    p_excluded_ids: Array.from(excludedUserIds),
    p_limit: DISCOVERY_LIMIT,
  });

  if (error) {
    console.error("[discover] RPC discover_profiles:", error.message);
    return loadDiscoveryProfilesFallback(supabase, excludedUserIds, viewerId);
  }

  const profiles = (rows as DiscoverProfileRow[] | null) ?? [];
  return attachPhotos(supabase, profiles);
}

/** Repli direct sur profiles (RLS) si la RPC discover_profiles est absente ou en erreur. */
async function loadDiscoveryProfilesFallback(
  supabase: SupabaseServer,
  excludedUserIds: Set<string>,
  viewerId?: string
): Promise<DiscoveryProfile[]> {
  let resolvedViewerId = viewerId;
  if (!resolvedViewerId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    resolvedViewerId = user?.id;
  }

  const withLanguages = await supabase
    .from("profiles")
    .select(`${DISCOVERY_SELECT}, languages`)
    .in("status", ["active", "pending"])
    .eq("is_deleted", false)
    .eq("role", "user")
    .in("registration_payment_status", ["paid", "free", "unpaid"])
    .order("created_at", { ascending: false })
    .limit(DISCOVERY_LIMIT);

  const result =
    withLanguages.error?.message.includes("languages") ||
    withLanguages.error?.code === "42703"
      ? await supabase
          .from("profiles")
          .select(DISCOVERY_SELECT)
          .in("status", ["active", "pending"])
          .eq("is_deleted", false)
          .eq("role", "user")
          .in("registration_payment_status", ["paid", "free", "unpaid"])
          .order("created_at", { ascending: false })
          .limit(DISCOVERY_LIMIT)
      : withLanguages;

  if (result.error) {
    console.error("[discover] fallback profiles:", result.error.message);
    return [];
  }

  const visible = (result.data ?? []).filter(
    (p) =>
      !excludedUserIds.has(p.id) &&
      (!resolvedViewerId || p.id !== resolvedViewerId)
  ) as DiscoverProfileRow[];

  const withPhotos = await attachPhotos(supabase, visible);
  return withPhotos.filter((p) => hasVisiblePhoto(p));
}
