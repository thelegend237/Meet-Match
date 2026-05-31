"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Heart, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { likeProfile } from "@/lib/actions/likes";
import { getAge } from "@/lib/utils";
import { COUNTRIES } from "@/lib/validations/auth";
import type { PublicProfile } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface ProfileCardProps {
  profile: PublicProfile;
  alreadyLiked: boolean;
}

function countryName(code: string | null) {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

export function ProfileCard({ profile, alreadyLiked }: ProfileCardProps) {
  const [liked, setLiked] = useState(alreadyLiked);
  const [isPending, startTransition] = useTransition();

  const age = getAge(profile.date_of_birth);

  function handleLike() {
    if (liked) return;
    startTransition(async () => {
      const result = await likeProfile(profile.id);
      if (result.error) {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      } else {
        setLiked(true);
        toast({
          title: "Like envoyé",
          description: result.message || "Votre intérêt a été enregistré.",
        });
      }
    });
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="relative aspect-[4/5] bg-muted sm:aspect-[3/4]">
        {profile.primary_photo_url ? (
          <Image
            src={profile.primary_photo_url}
            alt={profile.display_name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Pas de photo
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4 pt-16">
          <h3 className="font-serif text-xl font-semibold text-white">
            {profile.display_name}
            {age !== null && (
              <span className="font-normal text-white/90">, {age} ans</span>
            )}
          </h3>
          {(profile.city || profile.country_code) && (
            <p className="mt-1 flex items-center gap-1 text-sm text-white/85">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {[profile.city, countryName(profile.country_code)]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>
      </div>

      <div className="p-4">
        {profile.language && (
          <p className="mb-3 text-xs text-muted-foreground">
            Langue : {profile.language === "fr" ? "Français" : profile.language}
          </p>
        )}
        <Button
          variant={liked ? "outline" : "secondary"}
          size="lg"
          className={cn("h-12 w-full text-base", liked && "border-secondary text-secondary")}
          disabled={liked || isPending}
          onClick={handleLike}
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Heart
              className={cn("h-5 w-5", liked && "fill-secondary text-secondary")}
            />
          )}
          {liked ? "Intérêt enregistré" : "Like"}
        </Button>
      </div>
    </article>
  );
}
