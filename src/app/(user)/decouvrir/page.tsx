import Link from "next/link";
import { Compass, Layers } from "lucide-react";
import { requireUser, hasPlatformAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getMyLikedIds } from "@/lib/actions/likes";
import { syncProfileGeolocation } from "@/lib/actions/geocode";
import { DiscoverFeed } from "@/components/user/discover-feed";
import { ProfileCompletionBanner, PaymentRequiredBanner } from "@/components/user/profile-banners";
import { Button } from "@/components/ui/button";
import { splitRecommendedProfiles } from "@/lib/discover/recommendations";
import { loadDiscoveryProfiles } from "@/lib/discover/load-profiles";
import { getViewerLocation } from "@/lib/discover/geo";
import { touchLastSeen } from "@/lib/actions/discover";
import { getDiscoveryExcludedUserIds } from "@/lib/matches/exclusions";
import type { GenderPreference } from "@/lib/types/database";

export const metadata = {
  title: "Découvrir",
};

export default async function DecouvrirPage() {
  const profile = await requireUser();

  if (!hasPlatformAccess(profile)) {
    return (
      <div className="space-y-5">
        <PaymentRequiredBanner profile={profile} />
        <ProfileCompletionBanner profile={profile} />
        <div className="rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
          <Compass className="mx-auto h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" />
          <p className="mt-4 text-base font-medium text-primary">
            Activez votre compte pour voir les profils
          </p>
          <Button variant="secondary" className="mt-6 h-12 w-full sm:w-auto" asChild>
            <Link href="/paiements">Activer mon compte</Link>
          </Button>
        </div>
      </div>
    );
  }

  await touchLastSeen();

  if (profile.city && profile.country_code && profile.latitude == null) {
    void syncProfileGeolocation(profile.id);
  }

  const supabase = await createClient();
  const [excludedUserIds, likedIds] = await Promise.all([
    getDiscoveryExcludedUserIds(supabase, profile.id),
    getMyLikedIds(),
  ]);

  const discoveryProfiles = await loadDiscoveryProfiles(supabase, excludedUserIds);
  const { others } = splitRecommendedProfiles(profile, discoveryProfiles, likedIds);

  const genderPreference: GenderPreference = profile.preferred_gender ?? "both";
  const viewerLocation = getViewerLocation(profile);

  return (
    <div className="-mx-4 space-y-2 sm:mx-0">
      {profile.profile_completion < 100 && (
        <div className="px-4 sm:px-0">
          <ProfileCompletionBanner profile={profile} />
        </div>
      )}

      {others.length === 0 ? (
        <div className="mx-4 rounded-2xl border border-border bg-card p-8 text-center sm:mx-0">
          <Compass className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            Aucun autre profil à parcourir pour le moment.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Consultez vos suggestions du jour dans Rencontres.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="secondary" asChild>
              <Link href="/rencontres">
                <Layers className="h-4 w-4" />
                Rencontres
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/decouvrir/likes">Mes likes ({likedIds.length})</Link>
            </Button>
          </div>
        </div>
      ) : (
        <DiscoverFeed
          profiles={others}
          likedIds={likedIds}
          genderPreference={genderPreference}
          viewerLocation={viewerLocation}
        />
      )}
    </div>
  );
}
