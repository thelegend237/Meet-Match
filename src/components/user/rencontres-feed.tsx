"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Compass, Heart, SlidersHorizontal } from "lucide-react";
import { DiscoverCardStack } from "@/components/user/discover-card-stack";
import { DiscoverBrowseToolbar } from "@/components/user/discover-browse-toolbar";
import { DiscoverProfileGridCard } from "@/components/user/discover-profile-grid-card";
import { ProfileDetailModal } from "@/components/user/profile-detail-modal";
import { likeProfile } from "@/lib/actions/likes";
import { passProfile } from "@/lib/actions/passes";
import {
  type GenderPreference,
  filterProfilesByGender,
} from "@/lib/discover/profile-status";
import type { DiscoveryProfile } from "@/lib/types/database";
import { toast } from "@/hooks/use-toast";

type ViewerLocation = Pick<DiscoveryProfile, "city" | "country_code">;
type ViewMode = "swipe" | "grid";

interface RencontresFeedProps {
  profiles: DiscoveryProfile[];
  likedIds: string[];
  passedIds: string[];
  genderPreference: GenderPreference;
  viewerLocation: ViewerLocation;
}

export function RencontresFeed({
  profiles,
  likedIds,
  passedIds,
  genderPreference: initialPreference,
  viewerLocation,
}: RencontresFeedProps) {
  const [selected, setSelected] = useState<DiscoveryProfile | null>(null);
  const [likedSet, setLikedSet] = useState(() => new Set(likedIds));
  const [passedSet, setPassedSet] = useState(() => new Set(passedIds));
  const [browseGender, setBrowseGender] =
    useState<GenderPreference>(initialPreference);
  const [viewMode, setViewMode] = useState<ViewMode>("swipe");
  const [likePendingId, setLikePendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleLiked(id: string) {
    setLikedSet((prev) => new Set(prev).add(id));
  }

  function handleQuickLike(profile: DiscoveryProfile) {
    if (likedSet.has(profile.id) || pending) return;
    setLikedSet((prev) => new Set(prev).add(profile.id));
    setLikePendingId(profile.id);
    startTransition(async () => {
      const result = await likeProfile(profile.id);
      setLikePendingId(null);
      if (result.error) {
        setLikedSet((prev) => {
          const next = new Set(prev);
          next.delete(profile.id);
          return next;
        });
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
        return;
      }
      toast({
        title: "Intérêt envoyé",
        description: result.message ?? "Votre like a été enregistré.",
      });
    });
  }

  function handlePass(profile: DiscoveryProfile) {
    if (passedSet.has(profile.id) || pending) return;
    setPassedSet((prev) => new Set(prev).add(profile.id));
    startTransition(async () => {
      const result = await passProfile(profile.id);
      if (result.error) {
        setPassedSet((prev) => {
          const next = new Set(prev);
          next.delete(profile.id);
          return next;
        });
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
      }
    });
  }

  const filteredProfiles = useMemo(
    () => filterProfilesByGender(profiles, browseGender),
    [profiles, browseGender]
  );

  const swipeDeck = useMemo(
    () =>
      filteredProfiles.filter(
        (profile) => !likedSet.has(profile.id) && !passedSet.has(profile.id)
      ),
    [filteredProfiles, likedSet, passedSet]
  );

  return (
    <>
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-sans text-2xl font-bold text-primary sm:text-3xl">
              Rencontres
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              Suggestions du jour · des profils sélectionnés pour vous.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/decouvrir"
              className="rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-secondary"
              aria-label="Tous les profils"
            >
              <Compass className="h-5 w-5" />
            </Link>
            <Link
              href="/decouvrir/likes"
              className="relative rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-secondary"
              aria-label="Mes likes envoyés"
            >
              <Heart className="h-5 w-5" />
              {likedSet.size > 0 && (
                <span className="mm-badge-count absolute -right-0.5 -top-0.5">
                  {likedSet.size > 9 ? "9+" : likedSet.size}
                </span>
              )}
            </Link>
            <Link
              href="/profil/modifier"
              className="rounded-full p-2.5 text-muted-foreground hover:bg-muted"
              aria-label="Préférences de recherche"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </Link>
          </div>
        </div>

        <DiscoverBrowseToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          browseGender={browseGender}
          onBrowseGenderChange={setBrowseGender}
          profileCount={filteredProfiles.length}
        />

        <p className="text-xs text-muted-foreground">
          {viewMode === "swipe" ? (
            <>
              Glissez à droite pour liker, à gauche pour passer · parcourir tous les profils dans{" "}
            </>
          ) : (
            <>Parcourir tous les profils dans </>
          )}
          <Link href="/decouvrir" className="font-medium text-secondary hover:underline">
            Découvrir
          </Link>
          {" · "}
          <Link href="/profil/modifier" className="text-secondary hover:underline">
            modifier vos préférences
          </Link>
        </p>
      </header>

      {viewMode === "swipe" ? (
        swipeDeck.length > 0 ? (
          <DiscoverCardStack
            profiles={swipeDeck}
            viewerLocation={viewerLocation}
            pending={pending}
            onPass={handlePass}
            onLike={handleQuickLike}
            onOpen={setSelected}
          />
        ) : (
          <div className="mm-card p-10 text-center">
            <p className="text-muted-foreground">
              Vous avez parcouru toutes les suggestions du jour en mode carte.
            </p>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className="mt-4 text-sm font-medium text-secondary hover:underline"
            >
              Voir la grille des suggestions
            </button>
          </div>
        )
      ) : filteredProfiles.length > 0 ? (
        <section className="mt-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
            {filteredProfiles.map((profile) => (
              <DiscoverProfileGridCard
                key={profile.id}
                profile={profile}
                viewerLocation={viewerLocation}
                liked={likedSet.has(profile.id)}
                likePending={likePendingId === profile.id}
                onOpen={() => setSelected(profile)}
                onLike={() => handleQuickLike(profile)}
              />
            ))}
          </div>
        </section>
      ) : (
        <div className="mm-card mt-2 p-10 text-center">
          <p className="text-muted-foreground">
            Aucune suggestion ne correspond à votre filtre pour le moment.
          </p>
          <button
            type="button"
            onClick={() => setBrowseGender("both")}
            className="mt-4 text-sm font-medium text-secondary hover:underline"
          >
            Voir toutes les suggestions
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
