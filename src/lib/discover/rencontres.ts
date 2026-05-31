import type { DiscoveryProfile, Profile } from "@/lib/types/database";
import { splitRecommendedProfiles } from "@/lib/discover/recommendations";

function dailySortKey(profileId: string, viewerId: string): number {
  const day = new Date().toISOString().slice(0, 10);
  const seed = `${day}:${viewerId}:${profileId}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return hash;
}

/** Même logique que « Suggestions du jour » dans Découvrir, avec exclusion des passes. */
export function getRencontresProfiles(
  viewer: Profile,
  profiles: DiscoveryProfile[],
  likedIds: string[],
  passedIds: string[]
): DiscoveryProfile[] {
  const passed = new Set(passedIds);
  const { suggested } = splitRecommendedProfiles(viewer, profiles, likedIds);

  return suggested
    .filter((profile) => !passed.has(profile.id))
    .sort(
      (a, b) =>
        dailySortKey(a.id, viewer.id) - dailySortKey(b.id, viewer.id)
    );
}
