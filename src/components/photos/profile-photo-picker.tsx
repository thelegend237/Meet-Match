"use client";

import { useRef } from "react";
import { Camera, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PROFILE_PHOTO_ACCEPT,
  validateProfilePhotoFile,
} from "@/lib/photos/limits";
import { cn } from "@/lib/utils";

type ProfilePhotoPickerProps = {
  onFile: (file: File) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  isPending?: boolean;
  className?: string;
  layout?: "stack" | "inline";
};

export function ProfilePhotoPicker({
  onFile,
  onError,
  disabled = false,
  isPending = false,
  className,
  layout = "stack",
}: ProfilePhotoPickerProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationError = validateProfilePhotoFile(file);
    if (validationError) {
      onError?.(validationError);
      return;
    }

    onFile(file);
  }

  return (
    <div className={cn("w-full", className)}>
      <input
        ref={galleryRef}
        type="file"
        accept={PROFILE_PHOTO_ACCEPT}
        className="hidden"
        disabled={disabled || isPending}
        onChange={handleChange}
      />
      <input
        ref={cameraRef}
        type="file"
        accept={PROFILE_PHOTO_ACCEPT}
        capture="user"
        className="hidden"
        disabled={disabled || isPending}
        onChange={handleChange}
      />

      <div
        className={cn(
          "flex gap-2",
          layout === "stack"
            ? "flex-col sm:flex-row sm:flex-wrap sm:justify-center"
            : "flex-row flex-wrap justify-center"
        )}
      >
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 w-full gap-2 sm:w-auto"
          disabled={disabled || isPending}
          onClick={() => galleryRef.current?.click()}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImageIcon className="h-4 w-4" />
          )}
          Choisir depuis la galerie
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 w-full gap-2 sm:w-auto"
          disabled={disabled || isPending}
          onClick={() => cameraRef.current?.click()}
        >
          <Camera className="h-4 w-4" />
          Prendre une photo
        </Button>
      </div>
    </div>
  );
}
