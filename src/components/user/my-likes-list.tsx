"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin } from "lucide-react";
import { ProfileDetailModal } from "@/components/user/profile-detail-modal";
import { getAge } from "@/lib/utils";
import type { DiscoveryProfile } from "@/lib/types/database";

type LikedProfile = DiscoveryProfile & { liked_at: string };

interface MyLikesListProps {
  profiles: LikedProfile[];
}

export function MyLikesList({ profiles }: MyLikesListProps) {
  const [selected, setSelected] = useState<LikedProfile | null>(null);

  if (profiles.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <Heart className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-4 font-medium text-primary">Aucun like pour le moment</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Parcourez les profils et montrez votre intérêt — l&apos;équipe pourra
          vous proposer une mise en relation si c&apos;est réciproque.
        </p>
        <Link
          href="/decouvrir"
          className="mt-6 inline-flex rounded-full bg-secondary px-5 py-2.5 text-sm font-medium text-white"
        >
          Découvrir des profils
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile) => {
          const age = getAge(profile.date_of_birth);
          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => setSelected(profile)}
              className="flex gap-4 rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-secondary/30 hover:bg-muted/20"
            >
              <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                {profile.primary_photo_url ? (
                  <Image
                    src={profile.primary_photo_url}
                    alt={profile.display_name}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    —
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-primary">
                  {profile.display_name}
                  {age !== null && `, ${age}`}
                </p>
                {profile.city && (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {profile.city}
                  </p>
                )}
                <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-secondary">
                  <Heart className="h-3 w-3 fill-current" />
                  Intérêt envoyé
                </p>
                {profile.liked_at && (
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(profile.liked_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <ProfileDetailModal
        profile={selected}
        alreadyLiked
        onClose={() => setSelected(null)}
      />
    </>
  );
}
