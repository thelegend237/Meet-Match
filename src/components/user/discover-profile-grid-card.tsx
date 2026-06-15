"use client";

import Image from "next/image";
import { BadgeCheck, Heart, Loader2, MapPin } from "lucide-react";
import { ProfileCardBadges } from "@/components/user/profile-card-badges";
import { formatProfileDistance } from "@/lib/discover/geo";
import type { GenderPreference } from "@/lib/discover/profile-status";
import { getAge, cn } from "@/lib/utils";
import type { DiscoveryProfile } from "@/lib/types/database";

type ViewerLocation = Pick<DiscoveryProfile, "city" | "country_code">;

export const GENDER_FILTERS: { value: GenderPreference; label: string }[] = [
  { value: "both", label: "Tous" },
  { value: "female", label: "Femmes" },
  { value: "male", label: "Hommes" },
];

export function DiscoverProfileGridCard({
  profile,
  viewerLocation,
  liked,
  likePending,
  onOpen,
  onLike,
}: {
  profile: DiscoveryProfile;
  viewerLocation: ViewerLocation;
  liked: boolean;
  likePending: boolean;
  onOpen: () => void;
  onLike: () => void;
}) {
  const age = getAge(profile.date_of_birth);
  const distanceLabel = formatProfileDistance(viewerLocation, profile);

  return (
    <article className="mm-card flex flex-col overflow-hidden transition-shadow hover:shadow-[0_8px_32px_rgba(46,26,71,0.12)]">
      <button
        type="button"
        onClick={onOpen}
        className="relative aspect-[4/5] w-full overflow-hidden bg-muted text-left"
        aria-label={`Voir le profil de ${profile.display_name}`}
      >
        {profile.primary_photo_url ? (
          <Image
            src={profile.primary_photo_url}
            alt={profile.display_name}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            sizes="(max-width: 640px) 50vw, 20vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sans photo
          </div>
        )}
        <ProfileCardBadges profile={profile} />
      </button>

      <div className="flex flex-1 flex-col p-3">
        <button type="button" onClick={onOpen} className="text-left">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-semibold text-primary">
              {profile.display_name}
              {age !== null && `, ${age}`}
            </p>
            {profile.is_verified && (
              <BadgeCheck className="h-4 w-4 shrink-0 fill-secondary text-white" />
            )}
          </div>
          {profile.city && (
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {profile.city}
              {profile.country_code && `, ${profile.country_code}`}
              {distanceLabel && (
                <span className="text-muted-foreground/70"> · {distanceLabel}</span>
              )}
            </p>
          )}
        </button>

        <button
          type="button"
          onClick={() => (liked ? onOpen() : onLike())}
          disabled={likePending && !liked}
          className={cn(
            "mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-70",
            liked
              ? "bg-primary/80 hover:bg-primary"
              : "bg-secondary hover:bg-secondary/90"
          )}
        >
          {likePending && !liked ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Heart className={cn("h-4 w-4", liked && "fill-white")} />
          )}
          {liked ? "Liké · Voir profil" : "Like"}
        </button>
      </div>
    </article>
  );
}
