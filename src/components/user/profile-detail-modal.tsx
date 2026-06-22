"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  MoreHorizontal,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  showDiscoverActionError,
  showSubscriptionRequiredToast,
} from "@/lib/discover/interaction-toast";
import { likeProfile } from "@/lib/actions/likes";
import { ProfileCardBadges } from "@/components/user/profile-card-badges";
import {
  ProfileDetailBody,
  ProfileDetailMeta,
} from "@/components/user/profile-detail-body";
import { formatProfileDistance } from "@/lib/discover/geo";
import { COUNTRIES } from "@/lib/validations/auth";
import { getAge } from "@/lib/utils";
import type { DiscoveryProfile } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type ViewerLocation = Pick<DiscoveryProfile, "city" | "country_code">;

function countryName(code: string | null) {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

interface ProfileDetailModalProps {
  profile: DiscoveryProfile | null;
  alreadyLiked: boolean;
  onClose: () => void;
  onLiked?: (profileId: string) => void;
  canInteract?: boolean;
  viewerLocation?: ViewerLocation;
}

export function ProfileDetailModal({
  profile,
  alreadyLiked,
  onClose,
  onLiked,
  canInteract = true,
  viewerLocation,
}: ProfileDetailModalProps) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [liked, setLiked] = useState(alreadyLiked);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!profile || !mounted) return null;

  const photos = profile.photos?.length
    ? profile.photos
    : profile.primary_photo_url
      ? [profile.primary_photo_url]
      : [];

  const age = getAge(profile.date_of_birth);
  const currentPhoto = photos[photoIndex] ?? photos[0];
  const distanceLabel = viewerLocation
    ? formatProfileDistance(viewerLocation, profile)
    : null;
  const locationLine = [profile.city, countryName(profile.country_code)]
    .filter(Boolean)
    .join(", ");

  function goPhoto(delta: number) {
    if (photos.length <= 1) return;
    setPhotoIndex((i) => (i + delta + photos.length) % photos.length);
  }

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

  return createPortal(
    <div
      className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain"
      role="presentation"
    >
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <button
          type="button"
          className="fixed inset-0 bg-[#2e1a47]/40 backdrop-blur-[3px]"
          aria-label="Fermer"
          onClick={onClose}
        />

        <div
          className="relative mm-motion-card-enter flex max-h-[min(calc(100dvh-2rem),780px)] w-full max-w-md flex-col overflow-hidden rounded-[1.5rem] bg-[#f3eef8] shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
        >
          {/* Galerie */}
          <div className="relative h-[min(38dvh,340px)] w-full shrink-0 sm:h-[min(36dvh,380px)]">
          {currentPhoto ? (
            <>
              <Image
                src={currentPhoto}
                alt=""
                fill
                className="scale-110 object-cover blur-2xl brightness-75"
                sizes="(max-width: 448px) 100vw, 448px"
                aria-hidden
              />
              <Image
                src={currentPhoto}
                alt={profile.display_name}
                fill
                className="object-cover object-[center_22%]"
                sizes="(max-width: 448px) 100vw, 448px"
                priority
              />
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-[#ede9fe] text-[#9b8fa8]">
              Pas de photo
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/5 to-black/80" />

          {photos.length > 1 && (
            <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pt-3">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPhotoIndex(i)}
                  className="h-1 flex-1 overflow-hidden rounded-full bg-white/30"
                  aria-label={`Photo ${i + 1}`}
                >
                  <span
                    className={cn(
                      "block h-full rounded-full bg-white transition-all",
                      i === photoIndex ? "w-full" : "w-0"
                    )}
                  />
                </button>
              ))}
            </div>
          )}

          <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3 pt-4">
            <ProfileCardBadges profile={profile} className="relative left-0 top-0" />
            <div className="flex items-center gap-0.5">
              <Link
                href={`/contact?subject=signalement&profile=${encodeURIComponent(profile.display_name)}`}
                className="rounded-full p-2 text-white/90 transition-colors hover:bg-white/15"
                aria-label="Signaler ce profil"
                onClick={onClose}
              >
                <MoreHorizontal className="h-5 w-5" />
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-white transition-colors hover:bg-white/15"
                aria-label="Fermer"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => goPhoto(-1)}
                className="absolute left-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/40"
                aria-label="Photo précédente"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => goPhoto(1)}
                className="absolute right-2 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/40"
                aria-label="Photo suivante"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <div className="absolute inset-x-0 bottom-0 z-20 space-y-2.5 px-5 pb-4">
            <h2
              id="profile-modal-title"
              className="font-sans text-2xl font-bold tracking-tight text-white"
            >
              {profile.display_name}
              {age !== null && (
                <span className="font-normal text-white/90">, {age}</span>
              )}
            </h2>

            {locationLine && (
              <p className="flex items-center gap-1.5 text-sm text-white/90">
                <MapPin className="h-4 w-4 shrink-0 text-[#f9a8d4]" />
                <span>
                  {locationLine}
                  {distanceLabel && (
                    <span className="text-white/60"> · {distanceLabel}</span>
                  )}
                </span>
              </p>
            )}

            <ProfileDetailMeta profile={profile} variant="dark" />
          </div>
        </div>

        {/* Détails */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <ProfileDetailBody profile={profile} liked={liked} />
        </div>

        {/* Actions */}
        <div className="shrink-0 border-t border-[#e8e0f0]/80 bg-white px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="h-12 flex-1 rounded-xl border-[#e8e0f0]"
              onClick={onClose}
            >
              Fermer
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-12 flex-[1.4] rounded-xl shadow-md shadow-[#e91e8c]/20"
              disabled={liked || isPending}
              onClick={handleLike}
            >
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Heart
                  className={cn("mr-2 h-4 w-4", liked && "fill-current")}
                />
              )}
              {liked ? "Intérêt envoyé" : "Montrer mon intérêt"}
            </Button>
          </div>
        </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
