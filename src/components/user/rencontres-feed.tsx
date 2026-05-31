"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Heart, SlidersHorizontal } from "lucide-react";
import { DiscoverCardStack } from "@/components/user/discover-card-stack";
import { ProfileDetailModal } from "@/components/user/profile-detail-modal";
import { likeProfile } from "@/lib/actions/likes";
import { passProfile } from "@/lib/actions/passes";
import {
  type GenderPreference,
  filterProfilesByGender,
} from "@/lib/discover/profile-status";
import { cn } from "@/lib/utils";
import type { DiscoveryProfile } from "@/lib/types/database";
import { toast } from "@/hooks/use-toast";

type ViewerLocation = Pick<DiscoveryProfile, "city" | "country_code">;

interface RencontresFeedProps {
  profiles: DiscoveryProfile[];
  likedIds: string[];
  passedIds: string[];
  genderPreference: GenderPreference;
  viewerLocation: ViewerLocation;
}

const GENDER_FILTERS: { value: GenderPreference; label: string }[] = [
  { value: "both", label: "Tous" },
  { value: "female", label: "Femmes" },
  { value: "male", label: "Hommes" },
];

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
  const [pending, startTransition] = useTransition();

  function handleLiked(id: string) {
    setLikedSet((prev) => new Set(prev).add(id));
  }

  function handleQuickLike(profile: DiscoveryProfile) {
    if (likedSet.has(profile.id) || pending) return;
    startTransition(async () => {
      const result = await likeProfile(profile.id);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
        return;
      }
      handleLiked(profile.id);
      toast({
        title: "Intérêt envoyé",
        description: result.message ?? "Votre like a été enregistré.",
      });
    });
  }

  function handlePass(profile: DiscoveryProfile) {
    if (passedSet.has(profile.id) || pending) return;
    startTransition(async () => {
      const result = await passProfile(profile.id);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
        return;
      }
      setPassedSet((prev) => new Set(prev).add(profile.id));
    });
  }

  const deck = useMemo(() => {
    return filterProfilesByGender(profiles, browseGender).filter(
      (profile) => !likedSet.has(profile.id) && !passedSet.has(profile.id)
    );
  }, [profiles, browseGender, likedSet, passedSet]);

  return (
    <>
      <header className="space-y-3 px-4 pb-2 pt-1 sm:px-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl font-bold text-primary sm:text-3xl">
              Rencontres
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Suggestions du jour · swipe pour liker ou passer
            </p>
          </div>
          <div className="flex items-center gap-1">
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
      </header>

      <DiscoverCardStack
        profiles={deck}
        viewerLocation={viewerLocation}
        pending={pending}
        onPass={handlePass}
        onLike={handleQuickLike}
        onOpen={setSelected}
      />

      <ProfileDetailModal
        profile={selected}
        alreadyLiked={selected ? likedSet.has(selected.id) : false}
        onClose={() => setSelected(null)}
        onLiked={handleLiked}
      />
    </>
  );
}
