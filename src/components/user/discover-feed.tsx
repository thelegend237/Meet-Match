"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Heart, Layers, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { ProfileDetailModal } from "@/components/user/profile-detail-modal";
import { ProfileCardBadges } from "@/components/user/profile-card-badges";
import {
  type GenderPreference,
  filterProfilesByGender,
} from "@/lib/discover/profile-status";
import { getAge } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { formatProfileDistance } from "@/lib/discover/geo";
import type { DiscoveryProfile } from "@/lib/types/database";

type ViewerLocation = Pick<DiscoveryProfile, "city" | "country_code">;

interface DiscoverFeedProps {
  profiles: DiscoveryProfile[];
  likedIds: string[];
  genderPreference: GenderPreference;
  viewerLocation: ViewerLocation;
}

const GENDER_FILTERS: { value: GenderPreference; label: string }[] = [
  { value: "both", label: "Tous" },
  { value: "female", label: "Femmes" },
  { value: "male", label: "Hommes" },
];

function ProfileGridCard({
  profile,
  viewerLocation,
  liked,
  onSelect,
}: {
  profile: DiscoveryProfile;
  viewerLocation: ViewerLocation;
  liked: boolean;
  onSelect: () => void;
}) {
  const age = getAge(profile.date_of_birth);
  const distanceLabel = formatProfileDistance(viewerLocation, profile);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted text-left shadow-sm transition-transform active:scale-[0.98]"
    >
      {profile.primary_photo_url ? (
        <Image
          src={profile.primary_photo_url}
          alt={profile.display_name}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, 25vw"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Sans photo
        </div>
      )}

      <ProfileCardBadges profile={profile} />

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 pt-10">
        <p className="truncate text-sm font-semibold text-white">
          {profile.display_name}
          {age !== null && `, ${age}`}
        </p>
        {profile.city && (
          <p className="truncate text-xs text-white/80">
            {profile.city}
            {distanceLabel && (
              <span className="text-white/60"> · {distanceLabel}</span>
            )}
          </p>
        )}
      </div>
      {liked && (
        <span className="absolute right-2 top-2 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-white">
          Liké
        </span>
      )}
    </button>
  );
}

export function DiscoverFeed({
  profiles,
  likedIds,
  genderPreference: initialPreference,
  viewerLocation,
}: DiscoverFeedProps) {
  const [selected, setSelected] = useState<DiscoveryProfile | null>(null);
  const [likedSet, setLikedSet] = useState(() => new Set(likedIds));
  const [browseGender, setBrowseGender] =
    useState<GenderPreference>(initialPreference);

  function handleLiked(id: string) {
    setLikedSet((prev) => new Set(prev).add(id));
  }

  const filteredProfiles = useMemo(
    () => filterProfilesByGender(profiles, browseGender),
    [profiles, browseGender]
  );

  return (
    <>
      <header className="space-y-3 px-4 pb-2 pt-1 sm:px-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-primary sm:text-3xl">
              Découvrir
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Parcourez tous les profils, du plus proche au plus éloigné
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/rencontres"
              className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-secondary"
              aria-label="Suggestions du jour — Rencontres"
            >
              <Layers className="h-5 w-5" />
            </Link>
            <Link
              href="/decouvrir/likes"
              className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-secondary"
              aria-label="Mes likes envoyés"
            >
              <Heart className="h-5 w-5" />
              {likedSet.size > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-secondary px-1 text-[9px] font-bold text-white">
                  {likedSet.size > 9 ? "9+" : likedSet.size}
                </span>
              )}
            </Link>
            <Link
              href="/profil/modifier"
              className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              aria-label="Préférences de recherche"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {GENDER_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setBrowseGender(filter.value)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                browseGender === filter.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Les suggestions du jour sont dans{" "}
          <Link href="/rencontres" className="text-secondary hover:underline">
            Rencontres
          </Link>
          {" · "}
          <Link href="/profil/modifier" className="text-secondary hover:underline">
            modifier vos préférences
          </Link>
        </p>
      </header>

      {filteredProfiles.length > 0 ? (
        <section className="mt-2 px-4 sm:px-0">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {filteredProfiles.map((profile) => (
              <ProfileGridCard
                key={profile.id}
                profile={profile}
                viewerLocation={viewerLocation}
                liked={likedSet.has(profile.id)}
                onSelect={() => setSelected(profile)}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="mx-4 mt-6 rounded-2xl border border-border bg-card p-8 text-center sm:mx-0">
          <p className="text-muted-foreground">
            Aucun profil ne correspond à votre filtre pour le moment.
          </p>
          <button
            type="button"
            onClick={() => setBrowseGender("both")}
            className="mt-4 text-sm font-medium text-secondary hover:underline"
          >
            Voir tous les profils
          </button>
        </div>
      )}

      <ProfileDetailModal
        profile={selected}
        alreadyLiked={selected ? likedSet.has(selected.id) : false}
        onClose={() => setSelected(null)}
        onLiked={handleLiked}
      />
    </>
  );
}
