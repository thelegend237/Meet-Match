import type { DiscoveryProfile, Profile } from "@/lib/types/database";
import { getAge } from "@/lib/utils";
import { isNewMember } from "@/lib/discover/profile-status";
import {
  createProximityContext,
  getViewerLocation,
  proximityScoreBonus,
} from "@/lib/discover/geo";

const SUGGESTION_LIMIT = 8;

function scoreProfile(
  viewer: Profile,
  candidate: DiscoveryProfile & { distance_km?: number | null }
): number {
  let score = 0;
  const age = getAge(candidate.date_of_birth);

  if (
    age !== null &&
    viewer.preferred_age_min !== null &&
    viewer.preferred_age_max !== null &&
    age >= viewer.preferred_age_min &&
    age <= viewer.preferred_age_max
  ) {
    score += 30;
  } else if (
    age !== null &&
    viewer.preferred_age_min !== null &&
    age >= viewer.preferred_age_min
  ) {
    score += 10;
  } else if (
    age !== null &&
    viewer.preferred_age_max !== null &&
    age <= viewer.preferred_age_max
  ) {
    score += 10;
  }

  const distanceKm = candidate.distance_km ?? null;
  score += proximityScoreBonus(distanceKm, viewer.preferred_relation_scope);

  if (distanceKm === null || distanceKm >= 25) {
    if (
      viewer.preferred_city &&
      candidate.city &&
      viewer.preferred_city.toLowerCase() === candidate.city.toLowerCase()
    ) {
      score += 25;
    } else if (
      viewer.city &&
      candidate.city &&
      viewer.city.toLowerCase() === candidate.city.toLowerCase()
    ) {
      score += 20;
    }
  }

  if (
    viewer.preferred_country_code &&
    candidate.country_code === viewer.preferred_country_code
  ) {
    score += 15;
  } else if (
    viewer.country_code &&
    candidate.country_code === viewer.country_code
  ) {
    score += 10;
  }

  if (
    viewer.relationship_type &&
    candidate.relationship_type === viewer.relationship_type
  ) {
    score += 10;
  }

  if (candidate.bio && candidate.bio.length > 20) score += 5;
  if (isNewMember(candidate.created_at)) score += 15;
  if ((candidate.photos?.length ?? 0) >= 2) score += 5;

  return score;
}

function compareRanked(
  a: { score: number; profile: DiscoveryProfile & { distance_km?: number | null } },
  b: { score: number; profile: DiscoveryProfile & { distance_km?: number | null } }
): number {
  if (b.score !== a.score) return b.score - a.score;

  const distA = a.profile.distance_km ?? Number.POSITIVE_INFINITY;
  const distB = b.profile.distance_km ?? Number.POSITIVE_INFINITY;
  if (distA !== distB) return distA - distB;

  return a.profile.display_name.localeCompare(b.profile.display_name, "fr");
}

export interface DiscoverSections {
  suggested: DiscoveryProfile[];
  others: DiscoveryProfile[];
}

export function splitRecommendedProfiles(
  viewer: Profile,
  profiles: DiscoveryProfile[],
  likedIds: string[]
): DiscoverSections {
  const viewerLocation = getViewerLocation(viewer);
  const proximity = createProximityContext(viewerLocation);
  const liked = new Set(likedIds);

  const available = proximity.attachDistances(
    profiles.filter((p) => !liked.has(p.id))
  );

  const ranked = available
    .map((profile) => ({
      profile,
      score: scoreProfile(viewer, profile),
    }))
    .sort(compareRanked);

  const pickSuggested = (limit: number, minScore: number) =>
    ranked
      .filter((r) => r.score >= minScore)
      .slice(0, limit)
      .map((r) => r.profile);

  let suggested = pickSuggested(SUGGESTION_LIMIT, 1);
  const suggestedIds = new Set(suggested.map((p) => p.id));

  let others = proximity.sortByDistance(
    available.filter((p) => !suggestedIds.has(p.id))
  );

  if (suggested.length < 3 && available.length > 0) {
    suggested = ranked
      .slice(0, Math.min(SUGGESTION_LIMIT, available.length))
      .map((r) => r.profile);
    const fallbackIds = new Set(suggested.map((p) => p.id));
    others = proximity.sortByDistance(
      available.filter((p) => !fallbackIds.has(p.id))
    );
  }

  return { suggested, others };
}
