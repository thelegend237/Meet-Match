"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Heart,
  Layers,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { ProfileDetailModal } from "@/components/user/profile-detail-modal";
import { DiscoverCardStack } from "@/components/user/discover-card-stack";
import { DiscoverBrowseToolbar } from "@/components/user/discover-browse-toolbar";
import { DiscoverProfileGridCard } from "@/components/user/discover-profile-grid-card";
import {
  type GenderPreference,
  filterProfilesByGender,
} from "@/lib/discover/profile-status";
import { likeProfile } from "@/lib/actions/likes";
import { passProfile } from "@/lib/actions/passes";
import { toast } from "@/hooks/use-toast";
import { showDiscoverActionError, showSubscriptionRequiredToast } from "@/lib/discover/interaction-toast";
import { Reveal } from "@/components/motion/motion";
import type { DiscoveryProfile } from "@/lib/types/database";

type ViewerLocation = Pick<DiscoveryProfile, "city" | "country_code">;
type ViewMode = "swipe" | "grid";

interface DiscoverFeedProps {
  profiles: DiscoveryProfile[];
  likedIds: string[];
  passedIds: string[];
  genderPreference: GenderPreference;
  viewerLocation: ViewerLocation;
  canInteract?: boolean;
}

export function DiscoverFeed({
  profiles,
  likedIds,
  passedIds,
  genderPreference: initialPreference,
  viewerLocation,
  canInteract = true,
}: DiscoverFeedProps) {
  const [selected, setSelected] = useState<DiscoveryProfile | null>(null);
  const [likedSet, setLikedSet] = useState(() => new Set(likedIds));
  const [passedSet, setPassedSet] = useState(() => new Set(passedIds));
  const [browseGender, setBrowseGender] =
    useState<GenderPreference>(initialPreference);
  const [viewMode, setViewMode] = useState<ViewMode>("swipe");
  const [likePendingId, setLikePendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLiked(id: string) {
    setLikedSet((prev) => new Set(prev).add(id));
  }

  function handleQuickLike(profile: DiscoveryProfile) {
    if (!canInteract) {
      showSubscriptionRequiredToast();
      return;
    }
    if (likedSet.has(profile.id) || isPending) return;
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
        showDiscoverActionError(result.error);
        return;
      }
      toast({
        title: "Like envoyé",
        description: result.message ?? "Votre intérêt a été enregistré.",
      });
    });
  }

  function handlePass(profile: DiscoveryProfile) {
    if (!canInteract) {
      showSubscriptionRequiredToast();
      return;
    }
    if (passedSet.has(profile.id) || isPending) return;
    setPassedSet((prev) => new Set(prev).add(profile.id));
    startTransition(async () => {
      const result = await passProfile(profile.id);
      if (result.error) {
        setPassedSet((prev) => {
          const next = new Set(prev);
          next.delete(profile.id);
          return next;
        });
        showDiscoverActionError(result.error);
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
      <Reveal as="header" className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-sans text-2xl font-bold text-primary sm:text-4xl">
              Découvrez{" "}
              <span className="text-secondary">les profils</span>
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              Des célibataires sérieux en quête d&apos;une relation sincère et
              durable.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link
              href="/rencontres"
              className="rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-secondary"
              aria-label="Rencontres"
            >
              <Layers className="h-5 w-5" />
            </Link>
            <Link
              href="/decouvrir/likes"
              className="relative rounded-full p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-secondary"
              aria-label="Mes likes"
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
              aria-label="Préférences"
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
              Glissez à droite pour liker, à gauche pour passer · suggestions du jour dans{" "}
            </>
          ) : (
            <>Suggestions du jour dans </>
          )}
          <Link href="/rencontres" className="font-medium text-secondary hover:underline">
            Rencontres
          </Link>
          {" · "}
          <Link href="/profil/modifier" className="text-secondary hover:underline">
            modifier vos préférences
          </Link>
        </p>
      </Reveal>

      <Reveal delay={120}>
      {viewMode === "swipe" ? (
        swipeDeck.length > 0 ? (
          <DiscoverCardStack
            profiles={swipeDeck}
            viewerLocation={viewerLocation}
            pending={isPending}
            onPass={handlePass}
            onLike={handleQuickLike}
            onOpen={setSelected}
          />
        ) : (
          <div className="mm-card p-10 text-center">
            <p className="text-muted-foreground">
              Vous avez parcouru tous les profils en mode carte.
            </p>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className="mt-4 text-sm font-medium text-secondary hover:underline"
            >
              Voir la grille complète
            </button>
          </div>
        )
      ) : filteredProfiles.length > 0 ? (
        <section className="mt-6">
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
        <div className="mm-card mt-6 p-10 text-center">
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
      </Reveal>

      <ProfileDetailModal
        profile={selected}
        alreadyLiked={selected ? likedSet.has(selected.id) : false}
        onClose={() => setSelected(null)}
        onLiked={handleLiked}
        canInteract={canInteract}
        viewerLocation={viewerLocation}
      />
    </>
  );
}
