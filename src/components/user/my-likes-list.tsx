"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BadgeCheck,
  Calendar,
  Compass,
  Heart,
  Layers,
  MapPin,
  Sparkles,
} from "lucide-react";
import { ProfileDetailModal } from "@/components/user/profile-detail-modal";
import { ProfileCardBadges } from "@/components/user/profile-card-badges";
import { getAge } from "@/lib/utils";
import { RELATIONSHIP_LABELS } from "@/lib/validations/profile";
import type { DiscoveryProfile } from "@/lib/types/database";

type LikedProfile = DiscoveryProfile & { liked_at: string };

interface MyLikesListProps {
  profiles: LikedProfile[];
}

function formatLikedDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function LikedProfileCard({
  profile,
  onOpen,
}: {
  profile: LikedProfile;
  onOpen: () => void;
}) {
  const age = getAge(profile.date_of_birth);
  const relationshipLabel = profile.relationship_type
    ? RELATIONSHIP_LABELS[profile.relationship_type]
    : null;

  return (
    <article className="mm-card group flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(46,26,71,0.14)]">
      <button
        type="button"
        onClick={onOpen}
        className="relative aspect-[4/5] w-full shrink-0 overflow-hidden bg-muted text-left"
        aria-label={`Voir le profil de ${profile.display_name}`}
      >
        {profile.primary_photo_url ? (
          <Image
            src={profile.primary_photo_url}
            alt={profile.display_name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Sans photo
          </div>
        )}
        <ProfileCardBadges profile={profile} />
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-[#e91e8c] shadow-md backdrop-blur-sm">
          <Heart className="h-3.5 w-3.5 fill-current" />
          Intérêt envoyé
        </span>
      </button>

      <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
        <button
          type="button"
          onClick={onOpen}
          className="flex flex-1 flex-col text-left"
        >
          <div className="flex min-h-[3.5rem] items-start gap-1.5">
            <h2 className="line-clamp-2 flex-1 text-lg font-bold leading-snug text-[#2e1a47]">
              {profile.display_name}
              {age !== null && (
                <span className="font-semibold text-[#2e1a47]/85">, {age}</span>
              )}
            </h2>
            {profile.is_verified && (
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 fill-[#e91e8c] text-white" />
            )}
          </div>

          <p className="mt-2 flex min-h-5 items-center gap-1.5 text-sm text-[#6b5f7a]">
            <MapPin className="h-4 w-4 shrink-0 text-[#e91e8c]" />
            <span className="truncate">
              {profile.city
                ? `${profile.city}${profile.country_code ? `, ${profile.country_code}` : ""}`
                : "Localisation non renseignée"}
            </span>
          </p>

          <div className="mt-2 flex min-h-7 items-center">
            {relationshipLabel ? (
              <span className="inline-flex rounded-full bg-[#fce7f3] px-3 py-1 text-xs font-semibold text-[#7b3d8f]">
                {relationshipLabel}
              </span>
            ) : (
              <span className="invisible inline-flex rounded-full px-3 py-1 text-xs">
                —
              </span>
            )}
          </div>

          <p className="mt-3 min-h-[2.625rem] line-clamp-2 text-sm leading-relaxed text-[#6b5f7a]">
            {profile.bio?.trim() || "Aucune présentation pour le moment."}
          </p>
        </button>

        <div className="mt-auto flex min-h-12 shrink-0 items-center justify-between gap-3 border-t border-[#ebe6f0]/80 pt-4">
          <p className="flex min-w-0 flex-1 items-center gap-1.5 text-xs leading-snug text-[#9b8fa8]">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span className="line-clamp-2">
              {profile.liked_at
                ? `Liké le ${formatLikedDate(profile.liked_at)}`
                : "Like envoyé"}
            </span>
          </p>
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#7b3d8f] to-[#e91e8c] px-4 text-xs font-semibold text-white shadow-sm transition-all hover:brightness-105"
          >
            Voir le profil
          </button>
        </div>
      </div>
    </article>
  );
}

export function MyLikesList({ profiles }: MyLikesListProps) {
  const [selected, setSelected] = useState<LikedProfile | null>(null);

  if (profiles.length === 0) {
    return (
      <div className="mm-card flex flex-col items-center px-6 py-14 text-center sm:px-10">
        <div className="mm-landing-icon-pink h-16 w-16">
          <Heart className="h-8 w-8 stroke-[1.75]" />
        </div>
        <p className="mt-5 font-sans text-xl font-bold text-[#2e1a47] sm:text-2xl">
          Aucun like pour le moment
        </p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-[#6b5f7a]">
          Parcourez les profils et montrez votre intérêt — l&apos;équipe pourra
          vous proposer une mise en relation si c&apos;est réciproque.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/decouvrir"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7b3d8f] to-[#e91e8c] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#e91e8c]/25 hover:brightness-105"
          >
            <Compass className="h-4 w-4" />
            Découvrir des profils
          </Link>
          <Link
            href="/rencontres"
            className="inline-flex items-center gap-2 rounded-full border border-[#d8cfe8] bg-white px-6 py-2.5 text-sm font-semibold text-[#2e1a47] shadow-sm hover:border-[#e91e8c]/40"
          >
            <Layers className="h-4 w-4" />
            Suggestions du jour
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mm-card overflow-hidden p-0">
        <div className="h-1 w-full bg-gradient-to-r from-[#7b3d8f] via-[#e91e8c] to-[#f9a8d4]" />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <div className="mm-landing-icon-pink h-12 w-12 shrink-0">
              <Heart className="h-5 w-5 fill-current stroke-[1.75]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#2e1a47]">
                {profiles.length} profil{profiles.length > 1 ? "s" : ""} liké
                {profiles.length > 1 ? "s" : ""}
              </p>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#6b5f7a]">
                Si l&apos;intérêt est partagé, un administrateur pourra vous
                proposer une mise en relation accompagnée.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:shrink-0">
            <Link
              href="/decouvrir"
              className="inline-flex items-center gap-2 rounded-full border border-[#d8cfe8] bg-white px-4 py-2 text-sm font-semibold text-[#2e1a47] shadow-sm hover:border-[#e91e8c]/40"
            >
              <Compass className="h-4 w-4" />
              Découvrir
            </Link>
            <Link
              href="/rencontres"
              className="inline-flex items-center gap-2 rounded-full bg-[#fce7f3] px-4 py-2 text-sm font-semibold text-[#e91e8c] hover:bg-[#fce7f3]/80"
            >
              <Sparkles className="h-4 w-4" />
              Rencontres
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
        {profiles.map((profile) => (
          <LikedProfileCard
            key={profile.id}
            profile={profile}
            onOpen={() => setSelected(profile)}
          />
        ))}
      </div>

      <ProfileDetailModal
        profile={selected}
        alreadyLiked
        onClose={() => setSelected(null)}
      />
    </>
  );
}
