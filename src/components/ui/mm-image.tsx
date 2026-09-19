"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { optimizeSupabaseImageUrl } from "@/lib/photos/optimize-url";

type MmImageProps = Omit<ImageProps, "src"> & {
  src: string;
  /** Largeur demandée au CDN Supabase (indépendante de `sizes` Next). */
  optimizeWidth: number;
  optimizeHeight?: number;
  quality?: number;
};

/**
 * Affiche une photo profil allégée via Supabase Transform.
 * En cas d'échec (transform indisponible), retombe sur l'URL originale.
 */
export function MmImage({
  src,
  optimizeWidth,
  optimizeHeight,
  quality = 70,
  alt,
  onError,
  ...props
}: MmImageProps) {
  const [useOriginal, setUseOriginal] = useState(false);
  const resolved = useOriginal
    ? src
    : optimizeSupabaseImageUrl(src, {
        width: optimizeWidth,
        height: optimizeHeight,
        quality,
      });

  return (
    <Image
      {...props}
      alt={alt}
      src={resolved}
      onError={(event) => {
        if (!useOriginal) setUseOriginal(true);
        onError?.(event);
      }}
    />
  );
}
