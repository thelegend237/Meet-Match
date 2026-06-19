"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  MapPin,
  MoreHorizontal,
} from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { showDiscoverActionError, showSubscriptionRequiredToast } from "@/lib/discover/interaction-toast";
import { likeProfile } from "@/lib/actions/likes";
import { ProfileCardBadges } from "@/components/user/profile-card-badges";
import { getAge } from "@/lib/utils";
import { COUNTRIES } from "@/lib/validations/auth";
import {
  GENDER_LABELS,
  RELATIONSHIP_LABELS,
} from "@/lib/validations/profile";
import { formatProfileLanguages } from "@/lib/languages";
import type { DiscoveryProfile } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface ProfileDetailModalProps {
  profile: DiscoveryProfile | null;
  alreadyLiked: boolean;
  onClose: () => void;
  onLiked?: (profileId: string) => void;
  canInteract?: boolean;
}

function countryName(code: string | null) {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

export function ProfileDetailModal({
  profile,
  alreadyLiked,
  onClose,
  onLiked,
  canInteract = true,
}: ProfileDetailModalProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [liked, setLiked] = useState(alreadyLiked);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setPhotoIndex(0);
    setLiked(alreadyLiked);
  }, [profile?.id, alreadyLiked]);

  useEffect(() => {
    if (!profile) return;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [profile, onClose]);

  if (!profile) return null;

  const photos = profile.photos?.length
    ? profile.photos
    : profile.primary_photo_url
      ? [profile.primary_photo_url]
      : [];

  const age = getAge(profile.date_of_birth);
  const currentPhoto = photos[photoIndex] ?? photos[0];

  function handleLike() {
    if (!canInteract) {
      showSubscriptionRequiredToast();
      return;
    }
    if (liked || !profile) return;
    const profileId = profile.id;
    startTransition(async () => {
      const result = await likeProfile(profileId);
      if (result.error) {
        showDiscoverActionError(result.error);
      } else {
        setLiked(true);
        onLiked?.(profileId);
        toast({
          title: "Like envoyé",
          description: result.message || "Votre intérêt a été enregistré.",
        });
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        aria-label="Fermer"
        onClick={onClose}
      />

      <div
        className="relative flex h-[94dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-neutral-900 shadow-2xl sm:h-[90vh] sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        {/* Photo area */}
        <div className="relative min-h-0 flex-1">
          {currentPhoto ? (
            <Image
              src={currentPhoto}
              alt={profile.display_name}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-neutral-800 text-neutral-400">
              Pas de photo
            </div>
          )}

          {/* Top bar overlay */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/60 to-transparent p-4 pt-5">
            <div>
              <ProfileCardBadges profile={profile} className="relative left-0 top-0 mb-2" />
              <h2 id="profile-modal-title" className="text-2xl font-bold text-white">
                {profile.display_name}
                {age !== null && (
                  <span className="font-normal text-white/90">, {age}</span>
                )}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href={`/contact?subject=signalement&profile=${encodeURIComponent(profile.display_name)}`}
                className="rounded-full p-2 text-white/80 hover:bg-white/10"
                aria-label="Signaler ce profil"
                onClick={onClose}
              >
                <MoreHorizontal className="h-5 w-5" />
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-white hover:bg-white/10"
                aria-label="Fermer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Photo navigation */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setPhotoIndex((i) => (i > 0 ? i - 1 : photos.length - 1))
                }
                className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-lg"
                aria-label="Photo précédente"
              >
                <ChevronLeft className="h-5 w-5 text-neutral-900" />
              </button>
              <button
                type="button"
                onClick={() =>
                  setPhotoIndex((i) => (i < photos.length - 1 ? i + 1 : 0))
                }
                className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-lg"
                aria-label="Photo suivante"
              >
                <ChevronRight className="h-5 w-5 text-neutral-900" />
              </button>
              <div className="absolute inset-x-0 bottom-24 flex justify-center gap-1.5">
                {photos.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition-colors",
                      i === photoIndex ? "bg-white" : "bg-white/40"
                    )}
                  />
                ))}
              </div>
            </>
          )}

          {/* Like action — pas de chat (règle Meet & Match) */}
          <div className="absolute inset-x-0 bottom-6 flex justify-center">
            <button
              type="button"
              onClick={handleLike}
              disabled={liked || isPending}
              className={cn(
                "flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-xl transition-transform active:scale-95 disabled:opacity-80",
                liked && "ring-4 ring-secondary/50"
              )}
              aria-label={liked ? "Intérêt enregistré" : "Like"}
            >
              {isPending ? (
                <Loader2 className="h-7 w-7 animate-spin text-secondary" />
              ) : (
                <Heart
                  className={cn(
                    "h-8 w-8",
                    liked ? "fill-secondary text-secondary" : "text-neutral-800"
                  )}
                />
              )}
            </button>
          </div>
        </div>

        {/* Info scroll */}
        <div className="max-h-[35dvh] shrink-0 overflow-y-auto bg-white px-4 py-4">
          {(profile.city || profile.country_code) && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-secondary" />
              {[profile.city, countryName(profile.country_code)]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
          {profile.gender && (
            <p className="mt-2 text-sm text-neutral-600">
              {GENDER_LABELS[profile.gender]}
              {formatProfileLanguages(profile) && (
                <> · {formatProfileLanguages(profile)}</>
              )}
            </p>
          )}
          {profile.relationship_type && (
            <p className="mt-1 text-sm font-medium text-primary">
              {RELATIONSHIP_LABELS[profile.relationship_type]}
            </p>
          )}
          {profile.bio && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                À propos
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-neutral-700">
                {profile.bio}
              </p>
            </div>
          )}
          {profile.expectations && (
            <div className="mt-4 pb-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ce qu&apos;il/elle recherche
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-neutral-700">
                {profile.expectations}
              </p>
            </div>
          )}
          {liked && (
            <p className="mt-3 text-center text-sm font-medium text-secondary">
              Votre intérêt a été enregistré.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
