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
import { DISCOVERY_PAGE_SIZE } from "@/lib/discover/constants";
import { getRencontresProfiles } from "@/lib/discover/rencontres";
import { getViewerLocation } from "@/lib/discover/geo";
import { getDiscoveryExcludedUserIds } from "@/lib/matches/exclusions";
import { viewerHasDiscoveryPhoto } from "@/lib/discover/eligibility";
import type { GenderPreference } from "@/lib/types/database";

export const metadata = {
  title: "Rencontres",
};

export default async function RencontresPage() {
  const profile = await requireUser();
  const canInteract = hasPlatformAccess(profile);

  if (profile.city && profile.country_code && profile.latitude == null) {
    void syncProfileGeolocation(profile.id);
  }

  const supabase = await createClient();
  const [hasPhoto, excludedUserIds, likedIds, passedIds] = await Promise.all([
    viewerHasDiscoveryPhoto(supabase, profile.id, profile),
    getDiscoveryExcludedUserIds(supabase, profile.id),
    getMyLikedIds(profile.id),
    getMyPassedIds(profile.id),
  ]);

  const discoveryProfiles = await loadDiscoveryProfiles(
    supabase,
    excludedUserIds,
    profile.id,
    { limit: DISCOVERY_PAGE_SIZE }
  );
  const rencontresProfiles = getRencontresProfiles(
    profile,
    discoveryProfiles,
    likedIds,
    passedIds
  );

  const genderPreference: GenderPreference = profile.preferred_gender ?? "both";
  const viewerLocation = getViewerLocation(profile);
  const completion = profile.profile_completion ?? 0;
  const incomplete = !hasPhoto || completion < 80;

  let emptyTitle = "Aucune suggestion du jour";
  let emptyDescription =
    "Il n'y a pas encore d'autres membres actifs avec une photo. Explorez Découvrir ou revenez demain.";

  if (incomplete) {
    emptyTitle = "Complétez votre profil pour des suggestions";
    emptyDescription = !hasPhoto
      ? "Ajoutez une photo principale : sans photo, les Rencontres du jour restent vides et l'équipe ne peut pas vous matcher."
      : "Un profil plus complet (bio, localisation, attentes) améliore fortement les suggestions du jour.";
  } else if (likedIds.length > 0) {
    emptyTitle = "Plus de suggestions pour aujourd'hui";
    emptyDescription = `Vous avez déjà liké ${likedIds.length} profil${likedIds.length > 1 ? "s" : ""}. Revenez demain pour de nouvelles propositions, ou continuez dans Découvrir.`;
  }

  return (
    <PageStack className="gap-4">
      {!canInteract && (
        <div className="hidden md:block">
          <PaymentRequiredBanner profile={profile} />
        </div>
      )}
      {canInteract && !hasPhoto && <PhotoRequiredBanner />}
      {profile.profile_completion < 100 && (
        <ProfileCompletionBanner profile={profile} />
      )}

      {rencontresProfiles.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={emptyTitle}
          description={emptyDescription}
          action={
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {incomplete ? (
                <Button variant="secondary" className="rounded-full" asChild>
                  <Link href={!hasPhoto ? "/profil/photos" : "/profil/modifier"}>
                    {!hasPhoto ? "Ajouter une photo" : "Compléter mon profil"}
                  </Link>
                </Button>
              ) : null}
              <Button
                variant={incomplete ? "outline" : "secondary"}
                className="rounded-full"
                asChild
              >
                <Link href="/decouvrir">Découvrir</Link>
              </Button>
              {canInteract && likedIds.length > 0 && (
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
          viewerProfile={profile}
        />
      )}
    </PageStack>
  );
}
