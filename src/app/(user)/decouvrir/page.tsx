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
import { createProximityContext, getViewerLocation } from "@/lib/discover/geo";
import { loadDiscoveryProfiles } from "@/lib/discover/load-profiles";
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

  const liked = new Set(likedIds);
  const viewerLocation = getViewerLocation(profile);
  const proximity = createProximityContext(viewerLocation);
  const allProfiles = proximity.sortByDistance(
    discoveryProfiles.filter((p) => !liked.has(p.id))
  );

  const genderPreference: GenderPreference = profile.preferred_gender ?? "both";

  return (
    <PageStack className="gap-4">
      {!canInteract && <PaymentRequiredBanner profile={profile} />}
      {canInteract && !hasPhoto && <PhotoRequiredBanner />}
      {profile.profile_completion < 100 && (
        <ProfileCompletionBanner profile={profile} />
      )}

      {allProfiles.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Aucun profil pour le moment"
          description="Aucun autre membre avec une photo pour le moment. Ajoutez votre photo de profil et revenez plus tard — les nouveaux membres apparaissent ici dès qu'ils ont complété leur profil."
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
          profiles={allProfiles}
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
