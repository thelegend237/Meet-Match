"use client";

import { useTransition } from "react";
import Image from "next/image";
import { Camera, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  uploadProfilePhoto,
  setPrimaryPhoto,
  deleteProfilePhoto,
} from "@/lib/actions/photos";
import { MAX_PROFILE_PHOTO_MB } from "@/lib/photos/limits";
import { PROFILE_PHOTO_ANTI_FAKE_SHORT } from "@/lib/photos/copy";
import { ProfilePhotoPicker } from "@/components/photos/profile-photo-picker";
import { cn } from "@/lib/utils";
import type { ProfilePhoto } from "@/lib/types/database";

interface PhotoUploadProps {
  photos: ProfilePhoto[];
}

export function PhotoUpload({ photos }: PhotoUploadProps) {
  const [isPending, startTransition] = useTransition();

  function uploadFile(file: File) {
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
    });
  }

  function handleSetPrimary(photoId: string) {
    startTransition(async () => {
      const result = await setPrimaryPhoto(photoId);
      if (result.error) {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      } else {
        toast({ title: "Photo principale mise à jour" });
      }
    });
  }

  function handleDelete(photoId: string) {
    if (!confirm("Supprimer cette photo ?")) return;

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
      <div className="rounded-xl border-2 border-dashed border-border bg-muted/30 p-5 text-center sm:p-8">
        <Camera className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          {PROFILE_PHOTO_ANTI_FAKE_SHORT}
          <br className="hidden sm:inline" />
          <span className="sm:ml-0"> JPEG, PNG ou WebP — max {MAX_PROFILE_PHOTO_MB} Mo.</span>
        </p>

        <div className="mt-4">
          <ProfilePhotoPicker
            isPending={isPending}
            onFile={uploadFile}
            onError={(description) =>
              toast({ variant: "destructive", title: "Erreur", description })
            }
          />
        </div>
      </div>

      {photos.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          Aucune photo pour le moment.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((photo) => (
            <article
              key={photo.id}
              className={cn(
                "overflow-hidden rounded-xl border bg-card shadow-sm",
                photo.is_primary && "ring-2 ring-secondary/40"
              )}
            >
              <div className="relative aspect-[3/4] bg-muted">
                <Image
                  src={photo.url}
                  alt="Photo de profil"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 33vw"
                />
                {photo.is_primary && (
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                    <Star className="h-3 w-3 fill-white" />
                    Principale
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2 border-t border-border/60 p-3 sm:flex-row sm:flex-wrap">
                {!photo.is_primary ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={isPending}
                    className="min-h-11 flex-1 rounded-xl sm:min-h-9"
                    onClick={() => handleSetPrimary(photo.id)}
                  >
                    <Star className="h-4 w-4" />
                    Définir principale
                  </Button>
                ) : (
                  <p className="flex min-h-11 flex-1 items-center justify-center text-xs font-medium text-secondary sm:min-h-9 sm:justify-start">
                    Visible sur votre profil public
                  </p>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  className="min-h-11 flex-1 rounded-xl sm:min-h-9 sm:flex-none"
                  onClick={() => handleDelete(photo.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Supprimer
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
