import { COUNTRIES } from "@/lib/validations/auth";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT =
  process.env.GEOCODE_USER_AGENT ?? "MeetAndMatch/1.0 (contact@meetandmatch.app)";

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  source: "nominatim";
};

function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

/**
 * Géocodage via OpenStreetMap Nominatim (gratuit).
 * Respecter 1 req/s en prod — le cache Supabase limite les appels réels.
 */
export async function geocodeWithNominatim(
  city: string,
  countryCode: string
): Promise<GeocodeResult | null> {
  const trimmedCity = city.trim();
  if (!trimmedCity || !countryCode) return null;

  const query = `${trimmedCity}, ${countryName(countryCode)}`;
  const params = new URLSearchParams({
    format: "json",
    limit: "1",
    q: query,
    countrycodes: countryCode.toLowerCase(),
  });

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    console.error("[geocode] Nominatim HTTP", response.status);
    return null;
  }

  const results = (await response.json()) as Array<{
    lat: string;
    lon: string;
  }>;

  const hit = results[0];
  if (!hit) return null;

  const latitude = Number(hit.lat);
  const longitude = Number(hit.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude, source: "nominatim" };
}
