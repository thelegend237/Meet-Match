"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Camera, Loader2, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  uploadProfilePhoto,
  setPrimaryPhoto,
  deleteProfilePhoto,
} from "@/lib/actions/photos";
import type { ProfilePhoto } from "@/lib/types/database";

interface PhotoUploadProps {
  photos: ProfilePhoto[];
}

export function PhotoUpload({ photos }: PhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("isPrimary", photos.length === 0 ? "true" : "false");

    startTransition(async () => {
      const result = await uploadProfilePhoto(formData);
      if (result.error) {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      } else {
        toast({ title: "Photo ajoutée", description: "Votre photo a été uploadée." });
      }
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  function handleSetPrimary(photoId: string) {
    startTransition(async () => {
      const result = await setPrimaryPhoto(photoId);
      if (result.error) {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      }
    });
  }

  function handleDelete(photoId: string) {
    startTransition(async () => {
      const result = await deleteProfilePhoto(photoId);
      if (result.error) {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      } else {
        toast({ title: "Photo supprimée" });
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center">
        <Camera className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Photo principale obligatoire pour la visibilité de votre profil.
          <br />
          JPEG, PNG ou WebP — max 5 Mo.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          disabled={isPending}
          onClick={() => inputRef.current?.click()}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          Ajouter une photo
        </Button>
      </div>

      {photos.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          Aucune photo pour le moment.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative overflow-hidden rounded-xl border border-border"
            >
              <div className="relative aspect-[3/4]">
                <Image
                  src={photo.url}
                  alt="Photo de profil"
                  fill
                  className="object-cover"
                />
              </div>
              {photo.is_primary && (
                <Badge className="absolute left-2 top-2" variant="secondary">
                  Principale
                </Badge>
              )}
              <div className="absolute inset-x-0 bottom-0 flex gap-2 bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                {!photo.is_primary && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => handleSetPrimary(photo.id)}
                  >
                    <Star className="h-3 w-3" />
                    Principale
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-white/90"
                  disabled={isPending}
                  onClick={() => handleDelete(photo.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
