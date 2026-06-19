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
import { PROFILE_PHOTO_ANTI_FAKE_DISCOVERY } from "@/lib/photos/copy";
import type { GenderPreference } from "@/lib/types/database";

export const metadata = {
  title: "Rencontres",
};

export default async function RencontresPage() {
  const profile = await requireUser();

  if (!hasPlatformAccess(profile)) {
    return (
      <PageStack>
        <PaymentRequiredBanner profile={profile} />
        <ProfileCompletionBanner profile={profile} />
        <EmptyState
          icon={Layers}
          title="Activez votre compte"
          description="Réglez les frais d'inscription pour voir les suggestions du jour."
          actionHref="/paiements"
          actionLabel="Activer mon compte"
        />
      </PageStack>
    );
  }

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
      {!hasPhoto && <PhotoRequiredBanner />}
      {profile.profile_completion < 100 && (
        <ProfileCompletionBanner profile={profile} />
      )}

      {!hasPhoto ? (
        <EmptyState
          icon={Layers}
          title="Ajoutez une photo pour commencer"
          description={PROFILE_PHOTO_ANTI_FAKE_DISCOVERY}
          actionHref="/profil/photos"
          actionLabel="Ajouter ma photo"
        />
      ) : rencontresProfiles.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Aucune suggestion du jour"
          description="Il n'y a pas encore d'autres membres actifs avec une photo. Revenez demain ou explorez Découvrir."
          action={
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="secondary" className="rounded-full" asChild>
                <Link href="/decouvrir">Découvrir</Link>
              </Button>
              <Button variant="outline" className="rounded-full" asChild>
                <Link href="/decouvrir/likes">
                  Mes likes ({likedIds.length})
                </Link>
              </Button>
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
        />
      )}
    </PageStack>
  );
}
