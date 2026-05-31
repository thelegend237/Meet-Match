"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Heart,
  Info,
  Loader2,
  MapPin,
  RotateCcw,
  X,
} from "lucide-react";
import { ProfileCardBadges } from "@/components/user/profile-card-badges";
import { formatProfileDistance } from "@/lib/discover/geo";
import { getAge } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { DiscoveryProfile } from "@/lib/types/database";
import { Button } from "@/components/ui/button";

type ViewerLocation = Pick<DiscoveryProfile, "city" | "country_code">;

interface DiscoverCardStackProps {
  profiles: DiscoveryProfile[];
  viewerLocation: ViewerLocation;
  pending?: boolean;
  onPass: (profile: DiscoveryProfile) => void;
  onLike: (profile: DiscoveryProfile) => void;
  onOpen: (profile: DiscoveryProfile) => void;
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

  if (!current) {
    return (
      <div className="mx-4 flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center sm:mx-0">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary/10">
          <RotateCcw className="h-8 w-8 text-secondary" />
        </div>
        <h2 className="mt-4 font-serif text-xl font-bold text-primary">
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

  const age = getAge(current.date_of_birth);
  const distanceLabel = formatProfileDistance(viewerLocation, current);

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>{remaining} profil{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""}</span>
        <Link href="/decouvrir/likes" className="font-medium text-secondary hover:underline">
          Mes likes
        </Link>
      </div>

      <div className="relative mx-auto max-w-md">
        {next && (
          <div
            aria-hidden
            className="absolute inset-x-3 top-3 aspect-[3/4] overflow-hidden rounded-3xl bg-muted opacity-50 shadow-md"
          >
            {next.primary_photo_url && (
              <Image
                src={next.primary_photo_url}
                alt=""
                fill
                className="object-cover"
                sizes="360px"
              />
            )}
          </div>
        )}

        <article className="relative aspect-[3/4] w-full overflow-hidden rounded-3xl bg-neutral-900 shadow-xl ring-1 ring-black/5">
          {current.primary_photo_url ? (
            <Image
              src={current.primary_photo_url}
              alt={current.display_name}
              fill
              className="object-cover"
              sizes="(max-width: 448px) 100vw, 400px"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-neutral-400">
              Sans photo
            </div>
          )}

          <ProfileCardBadges profile={current} />

          <button
            type="button"
            onClick={() => onOpen(current)}
            className="absolute inset-0 z-10"
            aria-label={`Voir le profil de ${current.display_name}`}
          />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-5 pt-24">
            <h2 className="text-2xl font-bold text-white">
              {current.display_name}
              {age !== null && (
                <span className="font-normal text-white/90">, {age}</span>
              )}
            </h2>
            {current.city && (
              <p className="mt-1 flex items-center gap-1 text-sm text-white/85">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {current.city}
                {distanceLabel && (
                  <span className="text-white/60"> · {distanceLabel}</span>
                )}
              </p>
            )}
            {current.bio && (
              <p className="mt-2 line-clamp-2 text-sm text-white/75">
                {current.bio}
              </p>
            )}
          </div>
        </article>

        <div className="relative z-30 -mt-8 flex items-center justify-center gap-4 pb-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => onPass(current)}
            className={cn(
              "flex h-14 w-14 items-center justify-center rounded-full border-2 border-border bg-card shadow-lg transition-transform hover:scale-105 active:scale-95",
              pending && "opacity-60"
            )}
            aria-label="Passer ce profil"
          >
            <X className="h-7 w-7 text-muted-foreground" />
          </button>

          <button
            type="button"
            disabled={pending}
            onClick={() => onOpen(current)}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-card/95 shadow-md transition-transform hover:scale-105 active:scale-95",
              pending && "opacity-60"
            )}
            aria-label="Voir le profil complet"
          >
            <Info className="h-5 w-5 text-primary" />
          </button>

          <button
            type="button"
            disabled={pending}
            onClick={() => onLike(current)}
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full bg-secondary shadow-lg shadow-secondary/30 transition-transform hover:scale-105 active:scale-95",
              pending && "opacity-60"
            )}
            aria-label="Montrer mon intérêt"
          >
            {pending ? (
              <Loader2 className="h-7 w-7 animate-spin text-white" />
            ) : (
              <Heart className="h-8 w-8 fill-white text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
