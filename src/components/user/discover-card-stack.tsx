"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  Info,
  Loader2,
  MapPin,
  MoreHorizontal,
  RotateCcw,
  X,
} from "lucide-react";
import { ProfileCardBadges } from "@/components/user/profile-card-badges";
import { formatProfileDistance } from "@/lib/discover/geo";
import { getAge, cn } from "@/lib/utils";
import type { DiscoveryProfile } from "@/lib/types/database";
import { Button } from "@/components/ui/button";
import { COUNTRIES } from "@/lib/validations/auth";
import {
  GENDER_LABELS,
  RELATIONSHIP_LABELS,
} from "@/lib/validations/profile";

type ViewerLocation = Pick<DiscoveryProfile, "city" | "country_code">;

interface DiscoverCardStackProps {
  profiles: DiscoveryProfile[];
  viewerLocation: ViewerLocation;
  pending?: boolean;
  onPass: (profile: DiscoveryProfile) => void;
  onLike: (profile: DiscoveryProfile) => void;
  onOpen: (profile: DiscoveryProfile) => void;
}

const SWIPE_THRESHOLD = 96;
const MAX_ROTATION = 12;

function countryName(code: string | null) {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

function ProfileBackdrop({ profiles }: { profiles: DiscoveryProfile[] }) {
  if (profiles.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]"
      aria-hidden
    >
      <div className="grid h-full grid-cols-3 gap-2 p-3 opacity-35 blur-md sm:grid-cols-4">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted"
          >
            {profile.primary_photo_url && (
              <Image
                src={profile.primary_photo_url}
                alt=""
                fill
                className="object-cover"
                sizes="120px"
              />
            )}
          </div>
        ))}
      </div>
      <div className="absolute inset-0 bg-[#f8f6fc]/55 backdrop-blur-[2px]" />
    </div>
  );
}

function SwipeStamp({
  label,
  side,
  opacity,
}: {
  label: string;
  side: "left" | "right";
  opacity: number;
}) {
  if (opacity <= 0.05) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-10 z-30 rounded-xl border-4 px-4 py-2 text-xl font-black uppercase tracking-wider shadow-lg",
        side === "right"
          ? "left-5 rotate-[-14deg] border-emerald-400 bg-emerald-500/15 text-emerald-300"
          : "right-5 rotate-[14deg] border-rose-400 bg-rose-500/15 text-rose-300"
      )}
      style={{ opacity }}
    >
      {label}
    </div>
  );
}

function SwipeableCard({
  profile,
  nextProfile,
  viewerLocation,
  pending,
  onPass,
  onLike,
  onOpen,
}: {
  profile: DiscoveryProfile;
  nextProfile?: DiscoveryProfile;
  viewerLocation: ViewerLocation;
  pending?: boolean;
  onPass: () => void;
  onLike: () => void;
  onOpen: () => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const pointerStartX = useRef(0);
  const pointerStartY = useRef(0);
  const hasDragged = useRef(false);

  useEffect(() => {
    setOffsetX(0);
    setIsDragging(false);
    setExitDir(null);
    hasDragged.current = false;
  }, [profile.id]);

  const rotation = Math.max(
    -MAX_ROTATION,
    Math.min(MAX_ROTATION, (offsetX / 240) * MAX_ROTATION)
  );
  const likeOpacity = Math.min(1, Math.max(0, offsetX / SWIPE_THRESHOLD));
  const passOpacity = Math.min(1, Math.max(0, -offsetX / SWIPE_THRESHOLD));

  const finishExit = useCallback(
    (dir: "left" | "right") => {
      setExitDir(dir);
      setIsDragging(false);
      setOffsetX(dir === "right" ? 420 : -420);
    },
    []
  );

  useEffect(() => {
    if (!exitDir) return;

    const timer = window.setTimeout(() => {
      if (exitDir === "right") onLike();
      else onPass();
    }, 320);

    return () => window.clearTimeout(timer);
  }, [exitDir, onLike, onPass]);

  function handlePointerDown(e: ReactPointerEvent<HTMLElement>) {
    if (pending || exitDir) return;
    hasDragged.current = false;
    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLElement>) {
    if (!isDragging || exitDir) return;

    const dx = e.clientX - pointerStartX.current;
    const dy = e.clientY - pointerStartY.current;

    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      hasDragged.current = true;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
      setOffsetX(dx);
    }
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLElement>) {
    if (!isDragging || exitDir) return;

    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (!hasDragged.current) {
      onOpen();
      setOffsetX(0);
      return;
    }

    if (offsetX > SWIPE_THRESHOLD) {
      finishExit("right");
      return;
    }

    if (offsetX < -SWIPE_THRESHOLD) {
      finishExit("left");
      return;
    }

    setOffsetX(0);
  }

  function handlePointerCancel() {
    setIsDragging(false);
    setOffsetX(0);
  }

  function triggerPass() {
    if (pending || exitDir) return;
    finishExit("left");
  }

  function triggerLike() {
    if (pending || exitDir) return;
    finishExit("right");
  }

  const age = getAge(profile.date_of_birth);
  const distanceLabel = formatProfileDistance(viewerLocation, profile);
  const country = countryName(profile.country_code);
  const genderLabel = profile.gender ? GENDER_LABELS[profile.gender] : null;
  const relationshipLabel = profile.relationship_type
    ? RELATIONSHIP_LABELS[profile.relationship_type]
    : null;

  const transform = exitDir
    ? `translateX(${offsetX}px) rotate(${exitDir === "right" ? MAX_ROTATION + 4 : -(MAX_ROTATION + 4)}deg)`
    : `translateX(${offsetX}px) rotate(${rotation}deg)`;

  return (
    <div className="relative mx-auto w-full max-w-lg sm:max-w-xl lg:max-w-2xl">
      {nextProfile && (
        <article
          aria-hidden
          className="absolute inset-x-4 top-4 aspect-[3/4.2] overflow-hidden rounded-[1.75rem] bg-neutral-800 opacity-55 shadow-lg transition-transform duration-300 mm-motion-card-enter"
          style={{
            transform: `scale(${0.94 + Math.min(Math.abs(offsetX) / 900, 0.04)})`,
          }}
        >
          {nextProfile.primary_photo_url && (
            <Image
              src={nextProfile.primary_photo_url}
              alt=""
              fill
              className="object-cover"
              sizes="480px"
            />
          )}
        </article>
      )}

      <article
        ref={cardRef}
        className={cn(
          "relative z-10 aspect-[3/4.2] w-full touch-none select-none overflow-hidden rounded-[1.75rem] bg-neutral-900 shadow-[0_24px_64px_rgba(46,26,71,0.28)] ring-1 ring-black/10",
          !isDragging && !exitDir && "mm-motion-card-enter"
        )}
        style={{
          transform,
          transition: isDragging
            ? "none"
            : "transform 0.32s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {profile.primary_photo_url ? (
          <Image
            src={profile.primary_photo_url}
            alt={profile.display_name}
            fill
            className="pointer-events-none object-cover"
            sizes="(max-width: 640px) 90vw, 560px"
            priority
            draggable={false}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-neutral-400">
            Sans photo
          </div>
        )}

        <ProfileCardBadges profile={profile} />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between bg-gradient-to-b from-black/55 to-transparent p-4 pt-5">
          <div className="min-w-0" />
          <div className="pointer-events-auto flex items-center gap-1">
            <Link
              href={`/contact?subject=signalement&profile=${encodeURIComponent(profile.display_name)}`}
              className="rounded-full p-2 text-white/85 transition-colors hover:bg-white/10"
              aria-label="Signaler ce profil"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-5 w-5" />
            </Link>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerPass();
              }}
              disabled={pending || !!exitDir}
              className="rounded-full p-2 text-white/85 transition-colors hover:bg-white/10 disabled:opacity-50"
              aria-label="Passer ce profil"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <SwipeStamp label="Like" side="right" opacity={likeOpacity} />
        <SwipeStamp label="Passer" side="left" opacity={passOpacity} />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-5 pb-28 pt-32 sm:px-7">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            {profile.display_name}
            {age !== null && (
              <span className="font-normal text-white/90">, {age}</span>
            )}
          </h2>

          {(profile.city || country) && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-white/90 sm:text-base">
              <MapPin className="h-4 w-4 shrink-0 text-[#f9a8d4]" />
              {[profile.city, country].filter(Boolean).join(", ")}
              {distanceLabel && (
                <span className="text-white/55"> · {distanceLabel}</span>
              )}
            </p>
          )}

          {(genderLabel || profile.language) && (
            <p className="mt-2 text-sm text-white/80">
              {[genderLabel, profile.language === "fr" ? "Français" : profile.language]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          {relationshipLabel && (
            <p className="mt-1 text-sm font-semibold text-white/95">
              {relationshipLabel}
            </p>
          )}

          {profile.bio && (
            <div className="mt-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                À propos
              </p>
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/85 sm:line-clamp-3">
                {profile.bio}
              </p>
            </div>
          )}

          {profile.expectations && (
            <div className="mt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                Ce qu&apos;il/elle recherche
              </p>
              <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-white/75">
                {profile.expectations}
              </p>
            </div>
          )}
        </div>
      </article>

      <div className="relative z-30 -mt-10 flex items-center justify-center gap-5 pb-2 sm:-mt-12 sm:gap-6">
        <button
          type="button"
          disabled={pending || !!exitDir}
          onClick={triggerPass}
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#e8e0f0] bg-white shadow-lg transition-transform hover:scale-105 active:scale-95 sm:h-16 sm:w-16",
            (pending || exitDir) && "opacity-60"
          )}
          aria-label="Passer ce profil"
        >
          <X className="h-7 w-7 text-[#6b5f7a]" />
        </button>

        <button
          type="button"
          disabled={pending || !!exitDir}
          onClick={onOpen}
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full border border-[#e8e0f0] bg-white/95 shadow-md transition-transform hover:scale-105 active:scale-95",
            (pending || exitDir) && "opacity-60"
          )}
          aria-label="Voir le profil complet"
        >
          <Info className="h-5 w-5 text-[#2e1a47]" />
        </button>

        <button
          type="button"
          disabled={pending || !!exitDir}
          onClick={triggerLike}
          className={cn(
            "flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-gradient-to-br from-[#7b3d8f] to-[#e91e8c] shadow-xl shadow-[#e91e8c]/35 transition-transform hover:scale-105 active:scale-95 sm:h-20 sm:w-20",
            (pending || exitDir) && "opacity-60"
          )}
          aria-label="Montrer mon intérêt"
        >
          {pending ? (
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          ) : (
            <Heart className="h-9 w-9 fill-white text-white" />
          )}
        </button>
      </div>
    </div>
  );
}

export function DiscoverCardStack({
  profiles,
  viewerLocation,
  pending = false,
  onPass,
  onLike,
  onOpen,
}: DiscoverCardStackProps) {
  const current = profiles[0];
  const remaining = profiles.length;
  const next = profiles[1];
  const backdropProfiles = profiles.slice(1, 7);

  if (!current) {
    return (
      <div className="mm-card flex flex-col items-center px-6 py-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
          <RotateCcw className="h-8 w-8 text-secondary" />
        </div>
        <h2 className="mt-4 font-sans text-xl font-bold text-primary">
          Plus de profils pour l&apos;instant
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Revenez demain ou parcourez tous les profils dans Découvrir.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="secondary" asChild>
            <Link href="/decouvrir">Découvrir</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/decouvrir/likes">Mes likes envoyés</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/profil/modifier">Ajuster mes préférences</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {remaining} profil{remaining > 1 ? "s" : ""} restant
          {remaining > 1 ? "s" : ""}
        </span>
        <span className="hidden text-xs text-muted-foreground/80 sm:inline">
          Glissez à droite pour liker · à gauche pour passer
        </span>
        <Link
          href="/decouvrir/likes"
          className="font-medium text-secondary hover:underline"
        >
          Mes likes
        </Link>
      </div>

      <div className="relative min-h-[min(78dvh,720px)] py-2 sm:py-4">
        <ProfileBackdrop profiles={backdropProfiles} />
        <SwipeableCard
          key={current.id}
          profile={current}
          nextProfile={next}
          viewerLocation={viewerLocation}
          pending={pending}
          onPass={() => onPass(current)}
          onLike={() => onLike(current)}
          onOpen={() => onOpen(current)}
        />
      </div>
    </div>
  );
}
