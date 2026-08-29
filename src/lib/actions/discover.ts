"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import type { GenderPreference } from "@/lib/discover/profile-status";
import {
  DISCOVERY_MAX_TOTAL,
  DISCOVERY_PAGE_SIZE,
} from "@/lib/discover/constants";
import { loadDiscoveryProfiles } from "@/lib/discover/load-profiles";
import { createProximityContext, getViewerLocation } from "@/lib/discover/geo";
import { getDiscoveryExcludedUserIds } from "@/lib/matches/exclusions";
import { touchLastSeen as touchLastSeenCore } from "@/lib/user/touch-last-seen";

export async function loadMoreDiscoveryProfiles(alreadyLoadedIds: string[]) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Non authentifié" as const };

  if (alreadyLoadedIds.length >= DISCOVERY_MAX_TOTAL) {
    return {
      profiles: [],
      hasMore: false,
      capped: true as const,
    };
  }

  const supabase = await createClient();
  const baseExcluded = await getDiscoveryExcludedUserIds(supabase, profile.id);
  const excluded = new Set([
    ...baseExcluded,
    ...alreadyLoadedIds.filter(Boolean),
  ]);

  const batch = await loadDiscoveryProfiles(
    supabase,
    excluded,
    profile.id,
    { limit: DISCOVERY_PAGE_SIZE }
  );

  const viewerLocation = getViewerLocation(profile);
  const proximity = createProximityContext(viewerLocation);
  const profiles = proximity.sortByDistance(batch);

  const totalAfter = alreadyLoadedIds.length + profiles.length;

  return {
    profiles,
    hasMore:
      profiles.length >= DISCOVERY_PAGE_SIZE &&
      totalAfter < DISCOVERY_MAX_TOTAL,
    capped: totalAfter >= DISCOVERY_MAX_TOTAL,
  };
}

export async function updatePreferredGender(preference: GenderPreference) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  if (!["male", "female", "both"].includes(preference)) {
    return { error: "Préférence invalide" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ preferred_gender: preference })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/decouvrir");
  revalidatePath("/profil/modifier");
  return { success: true };
}

export async function touchLastSeen() {
  await touchLastSeenCore();
}
