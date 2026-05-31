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
} from "@/components/user/profile-banners";
import { Button } from "@/components/ui/button";
import { loadDiscoveryProfiles } from "@/lib/discover/load-profiles";
import { getRencontresProfiles } from "@/lib/discover/rencontres";
import { getViewerLocation } from "@/lib/discover/geo";
import { touchLastSeen } from "@/lib/actions/discover";
import { getDiscoveryExcludedUserIds } from "@/lib/matches/exclusions";
import type { GenderPreference } from "@/lib/types/database";

export const metadata = {
  title: "Rencontres",
};

export default async function RencontresPage() {
  const profile = await requireUser();

  if (!hasPlatformAccess(profile)) {
    return (
      <div className="space-y-5">
        <PaymentRequiredBanner profile={profile} />
        <ProfileCompletionBanner profile={profile} />
        <div className="rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
          <Layers className="mx-auto h-10 w-10 text-muted-foreground sm:h-12 sm:w-12" />
          <p className="mt-4 text-base font-medium text-primary">
            Activez votre compte pour voir les rencontres du jour
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
  const [excludedUserIds, likedIds, passedIds] = await Promise.all([
    getDiscoveryExcludedUserIds(supabase, profile.id),
    getMyLikedIds(),
    getMyPassedIds(),
  ]);

  const discoveryProfiles = await loadDiscoveryProfiles(supabase, excludedUserIds);
  const rencontresProfiles = getRencontresProfiles(
    profile,
    discoveryProfiles,
    likedIds,
    passedIds
  );

  const genderPreference: GenderPreference = profile.preferred_gender ?? "both";
  const viewerLocation = getViewerLocation(profile);

  return (
    <div className="-mx-4 space-y-2 sm:mx-0">
      {profile.profile_completion < 100 && (
        <div className="px-4 sm:px-0">
          <ProfileCompletionBanner profile={profile} />
        </div>
      )}

      {rencontresProfiles.length === 0 ? (
        <div className="mx-4 rounded-2xl border border-border bg-card p-8 text-center sm:mx-0">
          <Layers className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">
            Aucune suggestion du jour pour le moment.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Explorez tous les profils dans Découvrir ou revenez demain.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="secondary" asChild>
              <Link href="/decouvrir">Découvrir</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/decouvrir/likes">Mes likes ({likedIds.length})</Link>
            </Button>
          </div>
        </div>
      ) : (
        <RencontresFeed
          profiles={rencontresProfiles}
          likedIds={likedIds}
          passedIds={passedIds}
          genderPreference={genderPreference}
          viewerLocation={viewerLocation}
        />
      )}
    </div>
  );
}
