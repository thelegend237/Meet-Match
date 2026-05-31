import type { createClient } from "@/lib/supabase/server";
import type { DiscoveryProfile } from "@/lib/types/database";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

type DiscoverProfileRow = {
  id: string;
  display_name: string;
  date_of_birth: string | null;
  country_code: string | null;
  city: string | null;
  language: string | null;
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
  distance_km: number | string | null;
};

const DISCOVERY_LIMIT = 1000;

export async function loadDiscoveryProfiles(
  supabase: SupabaseServer,
  excludedUserIds: Set<string>
): Promise<DiscoveryProfile[]> {
  const { data: rows, error } = await supabase.rpc("discover_profiles", {
    p_excluded_ids: Array.from(excludedUserIds),
    p_limit: DISCOVERY_LIMIT,
  });

  if (error) {
    console.error("[discover] RPC discover_profiles:", error.message);
    return loadDiscoveryProfilesFallback(supabase, excludedUserIds);
  }

  const profiles = (rows as DiscoverProfileRow[] | null) ?? [];
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

  return profiles.map((p) => ({
    id: p.id,
    display_name: p.display_name,
    date_of_birth: p.date_of_birth,
    country_code: p.country_code,
    city: p.city,
    language: p.language,
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
  }));
}

/** Repli si migration 009 non appliquée. */
async function loadDiscoveryProfilesFallback(
  supabase: SupabaseServer,
  excludedUserIds: Set<string>
): Promise<DiscoveryProfile[]> {
  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      `id, display_name, date_of_birth, country_code, city, language,
       primary_photo_url, bio, gender, expectations, relationship_type,
       created_at, is_verified, last_seen_at, latitude, longitude`
    )
    .eq("status", "active")
    .eq("is_deleted", false)
    .in("registration_payment_status", ["paid", "free"])
    .not("primary_photo_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(DISCOVERY_LIMIT);

  const visible = (profiles ?? []).filter((p) => !excludedUserIds.has(p.id));
  const profileIds = visible.map((p) => p.id);

  const { data: allPhotos } = profileIds.length
    ? await supabase
        .from("profile_photos")
        .select("profile_id, url, sort_order")
        .in("profile_id", profileIds)
        .order("sort_order")
    : { data: [] };

  const photosByProfile = (allPhotos ?? []).reduce<Record<string, string[]>>(
    (acc, ph) => {
      if (!acc[ph.profile_id]) acc[ph.profile_id] = [];
      acc[ph.profile_id].push(ph.url);
      return acc;
    },
    {}
  );

  return visible.map((p) => ({
    ...p,
    is_verified: p.is_verified ?? false,
    photos:
      photosByProfile[p.id]?.length > 0
        ? photosByProfile[p.id]
        : p.primary_photo_url
          ? [p.primary_photo_url]
          : [],
  }));
}
