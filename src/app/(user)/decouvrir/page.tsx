import Link from "next/link";
import { Compass, Layers } from "lucide-react";
import { requireUser, hasPlatformAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getMyLikedIds } from "@/lib/actions/likes";
import { getMyPassedIds } from "@/lib/actions/passes";
import { syncProfileGeolocation } from "@/lib/actions/geocode";
import { DiscoverFeed } from "@/components/user/discover-feed";
import {
  ProfileCompletionBanner,
  PaymentRequiredBanner,
  PhotoRequiredBanner,
} from "@/components/user/profile-banners";
import { PageStack } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { splitRecommendedProfiles } from "@/lib/discover/recommendations";
import { loadDiscoveryProfiles } from "@/lib/discover/load-profiles";
import { getViewerLocation } from "@/lib/discover/geo";
import { touchLastSeen } from "@/lib/actions/discover";
import { getDiscoveryExcludedUserIds } from "@/lib/matches/exclusions";
import { viewerHasDiscoveryPhoto } from "@/lib/discover/eligibility";
import type { GenderPreference } from "@/lib/types/database";

export const metadata = {
  title: "Découvrir",
};

export default async function DecouvrirPage() {
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
  const { others } = splitRecommendedProfiles(profile, discoveryProfiles, likedIds);

  const genderPreference: GenderPreference = profile.preferred_gender ?? "both";
  const viewerLocation = getViewerLocation(profile);

  return (
    <PageStack className="gap-4">
      {!canInteract && <PaymentRequiredBanner profile={profile} />}
      {canInteract && !hasPhoto && <PhotoRequiredBanner />}
      {profile.profile_completion < 100 && (
        <ProfileCompletionBanner profile={profile} />
      )}

      {others.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Aucun profil pour le moment"
          description="Il n'y a pas encore d'autres membres actifs avec une photo. Revenez plus tard ou invitez des personnes à rejoindre la plateforme."
          action={
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="secondary" className="rounded-full" asChild>
                <Link href="/rencontres">
                  <Layers className="h-4 w-4" />
                  Rencontres
                </Link>
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
        <DiscoverFeed
          profiles={others}
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
