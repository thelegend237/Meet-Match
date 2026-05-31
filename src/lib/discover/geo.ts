import type { DiscoveryProfile, Profile } from "@/lib/types/database";

export interface Coordinates {
  lat: number;
  lng: number;
}

type Locatable = Pick<DiscoveryProfile, "city" | "country_code"> & {
  latitude?: number | null;
  longitude?: number | null;
};

export type CoordinatePrecision = "city" | "country" | "none";

export interface ResolvedLocation {
  coords: Coordinates | null;
  precision: CoordinatePrecision;
}

/** Villes connues (seeds + pays onboarding) — clé `ville|CC` normalisée */
const CITY_COORDINATES: Record<string, Coordinates> = {
  "paris|FR": { lat: 48.8566, lng: 2.3522 },
  "lyon|FR": { lat: 45.764, lng: 4.8357 },
  "marseille|FR": { lat: 43.2965, lng: 5.3698 },
  "toulouse|FR": { lat: 43.6047, lng: 1.4442 },
  "nice|FR": { lat: 43.7102, lng: 7.262 },
  "nantes|FR": { lat: 47.2184, lng: -1.5536 },
  "strasbourg|FR": { lat: 48.5734, lng: 7.7521 },
  "montpellier|FR": { lat: 43.6108, lng: 3.8767 },
  "bordeaux|FR": { lat: 44.8378, lng: -0.5792 },
  "lille|FR": { lat: 50.6292, lng: 3.0573 },
  "rennes|FR": { lat: 48.1173, lng: -1.6778 },
  "reims|FR": { lat: 49.2583, lng: 4.0317 },
  "bruxelles|BE": { lat: 50.8503, lng: 4.3517 },
  "liege|BE": { lat: 50.6326, lng: 5.5797 },
  "liège|BE": { lat: 50.6326, lng: 5.5797 },
  "luxembourg|LU": { lat: 49.6116, lng: 6.1319 },
  "geneve|CH": { lat: 46.2044, lng: 6.1432 },
  "genève|CH": { lat: 46.2044, lng: 6.1432 },
  "lausanne|CH": { lat: 46.5197, lng: 6.6323 },
  "montreal|CA": { lat: 45.5017, lng: -73.5673 },
  "montréal|CA": { lat: 45.5017, lng: -73.5673 },
  "quebec|CA": { lat: 46.8139, lng: -71.208 },
  "québec|CA": { lat: 46.8139, lng: -71.208 },
  "douala|CM": { lat: 4.0511, lng: 9.7679 },
  "yaounde|CM": { lat: 3.848, lng: 11.5021 },
  "yaoundé|CM": { lat: 3.848, lng: 11.5021 },
  "abidjan|CI": { lat: 5.36, lng: -4.0083 },
  "dakar|SN": { lat: 14.7167, lng: -17.4677 },
  "london|GB": { lat: 51.5074, lng: -0.1278 },
  "berlin|DE": { lat: 52.52, lng: 13.405 },
  "madrid|ES": { lat: 40.4168, lng: -3.7038 },
  "rome|IT": { lat: 41.9028, lng: 12.4964 },
  "new york|US": { lat: 40.7128, lng: -74.006 },
  "dubai|AE": { lat: 25.2048, lng: 55.2708 },
  "casablanca|MA": { lat: 33.5731, lng: -7.5898 },
  "tunis|TN": { lat: 36.8065, lng: 10.1815 },
  "algiers|DZ": { lat: 36.7538, lng: 3.0588 },
  "alger|DZ": { lat: 36.7538, lng: 3.0588 },
};

/** Centroïdes pays (ISO 3166-1 alpha-2) — repli si la ville est inconnue */
const COUNTRY_CENTROIDS: Record<string, Coordinates> = {
  FR: { lat: 46.603354, lng: 1.888334 },
  BE: { lat: 50.503887, lng: 4.469936 },
  CH: { lat: 46.818188, lng: 8.227512 },
  CA: { lat: 56.130366, lng: -106.346771 },
  CM: { lat: 7.369722, lng: 12.354722 },
  CI: { lat: 7.539989, lng: -5.54708 },
  SN: { lat: 14.497401, lng: -14.452362 },
  GB: { lat: 55.378051, lng: -3.435973 },
  DE: { lat: 51.165691, lng: 10.451526 },
  ES: { lat: 40.463667, lng: -3.74922 },
  IT: { lat: 41.87194, lng: 12.56738 },
  US: { lat: 37.09024, lng: -95.712891 },
  MA: { lat: 31.791702, lng: -7.09262 },
  TN: { lat: 33.886917, lng: 9.537499 },
  DZ: { lat: 28.033886, lng: 1.659626 },
  AE: { lat: 23.424076, lng: 53.847818 },
  LU: { lat: 49.815273, lng: 6.129583 },
  MC: { lat: 43.738418, lng: 7.424616 },
  PT: { lat: 39.399872, lng: -8.224454 },
  NL: { lat: 52.132633, lng: 5.291266 },
};

export function normalizeCity(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

/** Ville / pays utilisés pour la proximité (repli sur préférences de recherche). */
export function getViewerLocation(
  profile: Pick<
    Profile,
    | "city"
    | "country_code"
    | "preferred_city"
    | "preferred_country_code"
    | "latitude"
    | "longitude"
  >
): Locatable {
  return {
    city: profile.city?.trim() || profile.preferred_city?.trim() || null,
    country_code:
      profile.country_code ?? profile.preferred_country_code ?? null,
    latitude: profile.latitude ?? null,
    longitude: profile.longitude ?? null,
  };
}

export function isSameCityCountry(a: Locatable, b: Locatable): boolean {
  if (!a.city?.trim() || !b.city?.trim()) return false;
  if (!a.country_code || !b.country_code) return false;
  return (
    a.country_code.toUpperCase() === b.country_code.toUpperCase() &&
    normalizeCity(a.city) === normalizeCity(b.city)
  );
}

function hasStoredCoordinates(point: Locatable): point is Locatable & {
  latitude: number;
  longitude: number;
} {
  return (
    typeof point.latitude === "number" &&
    typeof point.longitude === "number" &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude)
  );
}

function cacheKey(city: string | null, countryCode: string | null): string | null {
  const cc = countryCode?.toUpperCase();
  if (!cc) return null;
  if (city?.trim()) return `${normalizeCity(city)}|${cc}`;
  return `|${cc}`;
}

function resolveLocationUncached(
  city: string | null,
  countryCode: string | null
): ResolvedLocation {
  const cc = countryCode?.toUpperCase() ?? null;

  if (city?.trim() && cc) {
    const key = `${normalizeCity(city)}|${cc}`;
    const cityCoords = CITY_COORDINATES[key];
    if (cityCoords) {
      return { coords: cityCoords, precision: "city" };
    }
  }

  if (cc && COUNTRY_CENTROIDS[cc]) {
    return { coords: COUNTRY_CENTROIDS[cc], precision: "country" };
  }

  return { coords: null, precision: "none" };
}

const locationCache = new Map<string, ResolvedLocation>();

function locationCacheKey(city: string | null, countryCode: string | null): string | null {
  const base = cacheKey(city, countryCode);
  if (!base) return null;
  const trimmed = city?.trim();
  return trimmed ? `city:${base}` : `country:${base}`;
}

export function resolveLocation(
  city: string | null,
  countryCode: string | null
): ResolvedLocation {
  const key = locationCacheKey(city, countryCode);
  if (!key) return { coords: null, precision: "none" };

  if (locationCache.has(key)) {
    return locationCache.get(key)!;
  }

  const resolved = resolveLocationUncached(city, countryCode);
  locationCache.set(key, resolved);
  return resolved;
}

export function resolveCoordinates(
  city: string | null,
  countryCode: string | null
): Coordinates | null {
  return resolveLocation(city, countryCode).coords;
}

/**
 * Distance fiable entre deux profils.
 * - Même ville → 0
 * - Deux villes inconnues dans le même pays → null (évite un faux « 194 km » identique pour tous)
 * - Sinon Haversine sur coordonnées ville ou, à défaut, centroïde pays
 */
export function computeDistanceKm(
  viewer: Locatable,
  candidate: Locatable
): number | null {
  if (isSameCityCountry(viewer, candidate)) {
    return 0;
  }

  if (hasStoredCoordinates(viewer) && hasStoredCoordinates(candidate)) {
    return Math.round(
      haversineDistanceKm(
        { lat: viewer.latitude, lng: viewer.longitude },
        { lat: candidate.latitude, lng: candidate.longitude }
      )
    );
  }

  const viewerLoc = resolveLocation(viewer.city, viewer.country_code);
  const candidateLoc = resolveLocation(
    candidate.city,
    candidate.country_code
  );

  if (!viewerLoc.coords || !candidateLoc.coords) {
    return null;
  }

  const sameCountry =
    viewer.country_code &&
    candidate.country_code &&
    viewer.country_code.toUpperCase() ===
      candidate.country_code.toUpperCase();

  if (
    sameCountry &&
    viewerLoc.precision === "country" &&
    candidateLoc.precision === "country"
  ) {
    return null;
  }

  return Math.round(
    haversineDistanceKm(viewerLoc.coords, candidateLoc.coords)
  );
}

/** Réinitialise le cache (tests ou hot reload). */
export function clearCoordinatesCache(): void {
  locationCache.clear();
}

export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export interface ProximityContext {
  readonly viewerCoords: Coordinates | null;
  distanceTo(candidate: Locatable): number | null;
  attachDistances<T extends Locatable>(
    profiles: (T & { distance_km?: number | null })[]
  ): (T & { distance_km: number | null })[];
  sortByDistance<T extends Locatable & { distance_km?: number | null }>(
    profiles: T[]
  ): T[];
}

/** Contexte réutilisable : coordonnées viewer résolues une seule fois par requête. */
export function createProximityContext(viewer: Locatable): ProximityContext {
  const viewerLoc = hasStoredCoordinates(viewer)
    ? {
        coords: { lat: viewer.latitude, lng: viewer.longitude },
        precision: "city" as const,
      }
    : resolveLocation(viewer.city, viewer.country_code);

  function distanceTo(candidate: Locatable): number | null {
    return computeDistanceKm(viewer, candidate);
  }

  function attachDistances<T extends Locatable>(
    profiles: (T & { distance_km?: number | null })[]
  ): (T & { distance_km: number | null })[] {
    return profiles.map((profile) => {
      if (profile.distance_km !== undefined) {
        return profile as T & { distance_km: number | null };
      }
      return {
        ...profile,
        distance_km: distanceTo(profile),
      };
    });
  }

  function sortByDistance<T extends Locatable & { distance_km?: number | null }>(
    profiles: T[]
  ): T[] {
    return [...profiles].sort((a, b) => {
      const distA = a.distance_km ?? null;
      const distB = b.distance_km ?? null;

      if (distA === null && distB === null) return 0;
      if (distA === null) return 1;
      if (distB === null) return -1;
      return distA - distB;
    });
  }

  return {
    viewerCoords: viewerLoc.coords,
    distanceTo,
    attachDistances,
    sortByDistance,
  };
}

export function getDistanceKm(viewer: Locatable, candidate: Locatable): number | null {
  return computeDistanceKm(viewer, candidate);
}

export function formatDistanceKm(km: number | null | undefined): string | null {
  if (km === null || km === undefined) return null;
  if (km < 5) return "À proximité";
  if (km < 1000) return `${km} km`;
  const thousands = Math.round(km / 100) / 10;
  return `${thousands.toString().replace(".", ",")}k km`;
}

/** Libellé carte profil : tient compte de la même ville / du même pays. */
export function formatProfileDistance(
  viewer: Locatable,
  profile: Locatable & { distance_km?: number | null }
): string | null {
  if (isSameCityCountry(viewer, profile)) {
    return "À proximité";
  }

  const km =
    profile.distance_km !== undefined
      ? profile.distance_km
      : computeDistanceKm(viewer, profile);

  if (km === null) {
    if (
      viewer.country_code &&
      profile.country_code &&
      viewer.country_code.toUpperCase() ===
        profile.country_code.toUpperCase()
    ) {
      return "Même pays";
    }
    return null;
  }

  return formatDistanceKm(km);
}

export function sortProfilesByProximity<
  T extends Locatable & { distance_km?: number | null },
>(viewer: Locatable, profiles: T[]): T[] {
  const ctx = createProximityContext(viewer);

  const hasDistances = profiles.some((p) => p.distance_km !== undefined);
  if (hasDistances) {
    return ctx.sortByDistance(profiles);
  }

  return ctx.sortByDistance(ctx.attachDistances(profiles));
}

export function attachDistanceKm<T extends Locatable>(
  viewer: Locatable,
  profiles: (T & { distance_km?: number | null })[]
): (T & { distance_km: number | null })[] {
  return createProximityContext(viewer).attachDistances(profiles);
}

/** Bonus de score découverte selon la distance (km). */
export function proximityScoreBonus(
  distanceKm: number | null,
  scope: Profile["preferred_relation_scope"]
): number {
  if (distanceKm === null) return 0;

  if (scope === "international") {
    return distanceKm < 500 ? 5 : 0;
  }

  if (scope === "national") {
    if (distanceKm < 50) return 22;
    if (distanceKm < 200) return 14;
    if (distanceKm < 800) return 6;
    return 0;
  }

  // local ou non renseigné : favoriser la proximité
  if (distanceKm < 25) return 28;
  if (distanceKm < 80) return 18;
  if (distanceKm < 200) return 8;
  if (distanceKm < 500) return 3;
  return 0;
}
