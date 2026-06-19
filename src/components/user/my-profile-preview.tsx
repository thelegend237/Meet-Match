"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Pencil, Settings, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileCompletionBar } from "@/components/ui/progress";
import { getAge } from "@/lib/utils";
import { COUNTRIES } from "@/lib/validations/auth";
import {
  GENDER_LABELS,
  RELATIONSHIP_LABELS,
} from "@/lib/validations/profile";
import type { Profile } from "@/lib/types/database";

interface MyProfilePreviewProps {
  profile: Profile;
}

function countryName(code: string | null) {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

export function MyProfilePreview({ profile }: MyProfilePreviewProps) {
  const age = getAge(profile.date_of_birth);

  return (
    <div className="-mx-4 flex min-h-[calc(100dvh-8rem)] flex-col sm:mx-0">
      {/* Aperçu type carte profil */}
      <div className="relative mx-4 aspect-[3/4] overflow-hidden rounded-3xl bg-muted shadow-lg sm:mx-0 sm:max-h-[520px]">
        {profile.primary_photo_url ? (
          <Image
            src={profile.primary_photo_url}
            alt={profile.display_name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 400px"
            priority
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <span className="text-4xl">📷</span>
            <p className="text-sm">Ajoutez une photo principale</p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-5 pt-20">
          <h1 className="font-sans text-2xl font-bold text-white">
            {profile.display_name || "Mon profil"}
            {age !== null && (
              <span className="font-normal text-white/90">, {age}</span>
            )}
          </h1>
          {(profile.city || profile.gender) && (
            <p className="mt-1 text-sm text-white/85">
              {[
                profile.gender ? GENDER_LABELS[profile.gender] : null,
                profile.city,
                countryName(profile.country_code),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 space-y-4 px-4 py-5 sm:px-0">
        <div className="rounded-2xl border border-border bg-card p-4">
          <ProfileCompletionBar value={profile.profile_completion} />
        </div>

        {profile.bio && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              À propos de moi
            </h2>
            <p className="mt-2 text-sm leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {profile.expectations && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ce que je cherche
            </h2>
            <p className="mt-2 text-sm leading-relaxed">{profile.expectations}</p>
          </div>
        )}

        {profile.relationship_type && (
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
            <MapPin className="h-4 w-4 text-secondary shrink-0" />
            {RELATIONSHIP_LABELS[profile.relationship_type]}
          </div>
        )}
      </div>

      {/* Actions rapides */}
      <div className="sticky bottom-24 z-30 space-y-2 px-4 pb-2 sm:bottom-6 lg:static">
        <Button variant="secondary" size="lg" className="h-12 w-full text-base shadow-md" asChild>
          <Link href="/profil/modifier">
            <Pencil className="h-5 w-5" />
            Modifier le profil
          </Link>
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11" asChild>
            <Link href="/profil/photos">
              <Camera className="h-4 w-4" />
              Mes photos
            </Link>
          </Button>
          <Button variant="outline" className="h-11" asChild>
            <Link href="/profil/parametres">
              <Settings className="h-4 w-4" />
              Paramètres
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
