"use server";

import { createClient } from "@/lib/supabase/server";
import { geocodeWithNominatim } from "@/lib/geocode/nominatim";
import { resolveCoordinates, computeDistanceKm } from "@/lib/discover/geo";

type SyncResult =
  | { success: true; source: "cache" | "nominatim" | "static" | "unchanged" }
  | { error: string };

/**
 * Résout et enregistre les coordonnées du profil connecté.
 * 1. Cache Supabase (geocode_cache)
 * 2. Nominatim si absent
 * 3. Repli liste statique locale (geo.ts)
 */
export async function syncProfileGeolocation(
  userId?: string
): Promise<SyncResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié" };
  if (userId && userId !== user.id) return { error: "Non autorisé" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("city, country_code, latitude, longitude")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: "Profil introuvable" };
  }

  const city = profile.city?.trim();
  const countryCode = profile.country_code;
  if (!city || !countryCode) {
    return { error: "Ville ou pays manquant" };
  }

  const { data: cached, error: cacheError } = await supabase.rpc(
    "get_cached_geocode",
    {
      p_city: city,
      p_country_code: countryCode,
    }
  );

  if (cacheError) {
    console.error("[geocode] cache RPC:", cacheError.message);
  }

  const cacheRow = cached?.[0] as
    | { latitude: number; longitude: number }
    | undefined;

  if (cacheRow) {
    if (
      profile.latitude === cacheRow.latitude &&
      profile.longitude === cacheRow.longitude
    ) {
      return { success: true, source: "unchanged" };
    }

    const { error } = await supabase.rpc("set_profile_coordinates", {
      p_latitude: cacheRow.latitude,
      p_longitude: cacheRow.longitude,
      p_source: "cache",
    });

    if (error) return { error: error.message };
    return { success: true, source: "cache" };
  }

  const nominatim = await geocodeWithNominatim(city, countryCode);
  if (nominatim) {
    const { error } = await supabase.rpc("set_profile_coordinates", {
      p_latitude: nominatim.latitude,
      p_longitude: nominatim.longitude,
      p_source: nominatim.source,
    });
    if (error) return { error: error.message };
    return { success: true, source: "nominatim" };
  }

  const staticCoords = resolveCoordinates(city, countryCode);
  if (staticCoords) {
    const { error } = await supabase.rpc("set_profile_coordinates", {
      p_latitude: staticCoords.lat,
      p_longitude: staticCoords.lng,
      p_source: "static",
    });
    if (error) return { error: error.message };
    return { success: true, source: "static" };
  }

  return { error: "Impossible de géolocaliser cette ville" };
}
