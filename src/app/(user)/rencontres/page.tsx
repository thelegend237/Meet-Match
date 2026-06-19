import Link from "next/link";
import { Layers } from "lucide-react";
import { requireUser, hasPlatformAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getMyLikedIds } from "@/lib/actions/likes";
import { getMyPassedIds } from "@/lib/actions/passes";
import { syncProfileGeolocation } from "@/lib/actions/geocode";
import { RencontresFeed } from "@/components/user/rencontres-feed";
import {
  ProfileCompletionBanner,
  PaymentRequiredBanner,
  PhotoRequiredBanner,
} from "@/components/user/profile-banners";
import { PageStack } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { loadDiscoveryProfiles } from "@/lib/discover/load-profiles";
import { getRencontresProfiles } from "@/lib/discover/rencontres";
import { getViewerLocation } from "@/lib/discover/geo";
import { touchLastSeen } from "@/lib/actions/discover";
import { getDiscoveryExcludedUserIds } from "@/lib/matches/exclusions";
import { viewerHasDiscoveryPhoto } from "@/lib/discover/eligibility";
import type { GenderPreference } from "@/lib/types/database";

export const metadata = {
  title: "Rencontres",
};

export default async function RencontresPage() {
  const profile = await requireUser();
  const canInteract = hasPlatformAccess(profile);

  await touchLastSeen();

  if (profile.city && profile.country_code && profile.latitude == null) {
    void syncProfileGeolocation(profile.id);
  }

  const supabase = await createClient();
  const hasPhoto = await viewerHasDiscoveryPhoto(supabase, profile.id, profile);
  const [excludedUserIds, likedIds, passedIds] = await Promise.all([
    getDiscoveryExcludedUserIds(supabase, profile.id),
    getMyLikedIds(),
    getMyPassedIds(),
  ]);

  const discoveryProfiles = await loadDiscoveryProfiles(
    supabase,
    excludedUserIds,
    profile.id
  );
  const rencontresProfiles = getRencontresProfiles(
    profile,
    discoveryProfiles,
    likedIds,
    passedIds
  );

  const genderPreference: GenderPreference = profile.preferred_gender ?? "both";
  const viewerLocation = getViewerLocation(profile);

  return (
    <PageStack className="gap-4">
      {!canInteract && <PaymentRequiredBanner profile={profile} />}
      {canInteract && !hasPhoto && <PhotoRequiredBanner />}
      {profile.profile_completion < 100 && (
        <ProfileCompletionBanner profile={profile} />
      )}

      {rencontresProfiles.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Aucune suggestion du jour"
          description="Il n'y a pas encore d'autres membres actifs avec une photo. Explorez Découvrir ou revenez demain."
          action={
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="secondary" className="rounded-full" asChild>
                <Link href="/decouvrir">Découvrir</Link>
              </Button>
              {canInteract && (
                <Button variant="outline" className="rounded-full" asChild>
                  <Link href="/decouvrir/likes">
                    Mes likes ({likedIds.length})
                  </Link>
                </Button>
              )}
            </div>
          }
        />
      ) : (
        <RencontresFeed
          profiles={rencontresProfiles}
          likedIds={likedIds}
          passedIds={passedIds}
          genderPreference={genderPreference}
          viewerLocation={viewerLocation}
          canInteract={canInteract}
        />
      )}
    </PageStack>
  );
}
