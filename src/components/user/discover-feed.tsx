"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Compass,
  Heart,
  Layers,
  LayoutGrid,
  Loader2,
  SearchX,
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
import { loadMoreDiscoveryProfiles } from "@/lib/actions/discover";
import { toast } from "@/hooks/use-toast";
import { showDiscoverActionError, showSubscriptionRequiredToast } from "@/lib/discover/interaction-toast";
import { nudgePushAfterFirstLike } from "@/lib/discover/push-after-like";
import { Reveal } from "@/components/motion/motion";
import { PaymentActivationBanner } from "@/components/user/payment-activation-banner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/empty-state";
import { DISCOVERY_MAX_TOTAL } from "@/lib/discover/constants";
import type { DiscoveryProfile, Profile } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type ViewerLocation = Pick<DiscoveryProfile, "city" | "country_code">;
type ViewMode = "swipe" | "grid";

interface DiscoverFeedProps {
  profiles: DiscoveryProfile[];
  likedIds: string[];
  passedIds: string[];
  genderPreference: GenderPreference;
  viewerLocation: ViewerLocation;
  canInteract?: boolean;
  viewerProfile?: Profile;
  initialHasMore?: boolean;
}

export function DiscoverFeed({
  profiles: initialProfiles,
  likedIds,
  passedIds,
  genderPreference: initialPreference,
  viewerLocation,
  canInteract = true,
  viewerProfile,
  initialHasMore = false,
}: DiscoverFeedProps) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadMorePending, startLoadMore] = useTransition();
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
      if ("firstLike" in result && result.firstLike) {
        nudgePushAfterFirstLike();
      } else {
        toast({
          title: "Like envoyé",
          description: result.message ?? "Votre intérêt a été enregistré.",
        });
      }
    });
  }

  function handlePass(profile: DiscoveryProfile) {
    if (passedSet.has(profile.id) || isPending) return;
    setPassedSet((prev) => new Set(prev).add(profile.id));
    startTransition(async () => {
      const result = await passProfile(profile.id);
      if (result.error) {
        // Si la migration 044 n'est pas encore appliquée, garder l'avance locale du deck.
        if (!canInteract) return;
        setPassedSet((prev) => {
          const next = new Set(prev);
          next.delete(profile.id);
          return next;
        });
        showDiscoverActionError(result.error);
      }
    });
  }

  function handleLoadMore() {
    if (loadMorePending || !hasMore) return;
    const loadedIds = profiles.map((p) => p.id);
    startLoadMore(async () => {
      const result = await loadMoreDiscoveryProfiles(loadedIds);
      if ("error" in result && result.error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
        return;
      }
      setProfiles((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const next = result.profiles.filter((p) => !seen.has(p.id));
        return [...prev, ...next];
      });
      setHasMore(result.hasMore ?? false);
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
      <div
        className={cn(
          !canInteract &&
            "pb-[calc(var(--mm-bottom-nav-h)+5.5rem+env(safe-area-inset-bottom,0px))] md:pb-0"
        )}
      >
      <Reveal as="header" className="space-y-3 sm:space-y-4">
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="font-sans text-xl font-bold text-primary sm:text-4xl">
              Découvrez{" "}
              <span className="text-secondary">les profils</span>
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground sm:mt-2 sm:text-base">
              Des célibataires sérieux en quête d&apos;une relation sincère et
              durable.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-secondary" asChild>
              <Link href="/rencontres" aria-label="Rencontres">
                <Layers className="h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-secondary"
              asChild
            >
              <Link href="/decouvrir/likes" aria-label="Mes likes">
                <Heart className="h-5 w-5" />
                {likedSet.size > 0 && (
                  <span className="mm-badge-count absolute -right-0.5 -top-0.5">
                    {likedSet.size > 9 ? "9+" : likedSet.size}
                  </span>
                )}
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-secondary" asChild>
              <Link href="/profil/modifier" aria-label="Préférences">
                <SlidersHorizontal className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>

        <DiscoverBrowseToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          browseGender={browseGender}
          onBrowseGenderChange={setBrowseGender}
          profileCount={
            viewMode === "swipe" ? swipeDeck.length : filteredProfiles.length
          }
          totalCount={
            viewMode === "swipe" && swipeDeck.length !== filteredProfiles.length
              ? filteredProfiles.length
              : undefined
          }
        />

        <p className="hidden text-xs text-muted-foreground sm:block">
          {viewMode === "swipe" ? (
            <>
              Glissez à droite pour liker, à gauche pour passer · catalogue complet en mode{" "}
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-secondary"
                onClick={() => setViewMode("grid")}
              >
                Grille
              </Button>
              {" · suggestions du jour dans "}
            </>
          ) : (
            <>
              Catalogue des membres éligibles · suggestions du jour dans{" "}
            </>
          )}
          <Link href="/rencontres" className="font-medium text-secondary hover:underline">
            Rencontres
          </Link>
          {" · "}
          <Link href="/profil/modifier" className="font-medium text-secondary hover:underline">
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
            canInteract={canInteract}
            onPass={handlePass}
            onLike={handleQuickLike}
            onOpen={setSelected}
          />
        ) : (
          <EmptyState
            icon={Compass}
            title="Vous avez tout parcouru"
            description="Tous les profils chargés en mode carte ont été vus. Chargez-en d'autres ou passez en vue grille."
            action={
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {hasMore && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-full"
                    disabled={loadMorePending}
                    onClick={handleLoadMore}
                  >
                    {loadMorePending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Charger plus de profils
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Voir la grille
                </Button>
              </div>
            }
          />
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
          {(hasMore || profiles.length >= DISCOVERY_MAX_TOTAL) && (
            <div className="mt-8 flex flex-col items-center gap-2">
              {hasMore ? (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  disabled={loadMorePending}
                  onClick={handleLoadMore}
                >
                  {loadMorePending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Charger plus de profils
                </Button>
              ) : null}
              <p className="text-center text-xs text-muted-foreground">
                {profiles.length} profil{profiles.length > 1 ? "s" : ""} affiché
                {profiles.length > 1 ? "s" : ""}
                {profiles.length >= DISCOVERY_MAX_TOTAL
                  ? ` — limite de ${DISCOVERY_MAX_TOTAL} atteinte pour cette session`
                  : ""}
              </p>
            </div>
          )}
        </section>
      ) : (
        <EmptyState
          icon={SearchX}
          title="Aucun profil trouvé"
          description="Aucun profil ne correspond à votre filtre pour le moment. Élargissez vos critères pour découvrir plus de membres."
          action={
            <Button
              type="button"
              variant="secondary"
              className="mt-6 rounded-full"
              onClick={() => setBrowseGender("both")}
            >
              Voir tous les profils
            </Button>
          }
        />
      )}
      </Reveal>
      </div>

      {viewerProfile && !canInteract ? (
        <PaymentActivationBanner profile={viewerProfile} variant="sticky" />
      ) : null}

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
