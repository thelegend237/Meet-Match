/**
 * Redimensionne les photos via le CDN Supabase (Image Transformation, plan Pro)
 * au lieu de télécharger l'original — sans consommer le quota Vercel Image Optimization.
 */
const OBJECT_PUBLIC = "/storage/v1/object/public/";
const RENDER_PUBLIC = "/storage/v1/render/image/public/";

export type OptimizePhotoOptions = {
  width: number;
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
};

export function optimizeSupabaseImageUrl(
  url: string | null | undefined,
  options: OptimizePhotoOptions
): string {
  if (!url) return "";
  if (!url.includes(OBJECT_PUBLIC) || !url.includes("supabase.co")) {
    return url;
  }

  try {
    const transformed = url.replace(OBJECT_PUBLIC, RENDER_PUBLIC);
    const parsed = new URL(transformed);
    parsed.searchParams.set("width", String(Math.round(options.width)));
    if (options.height != null) {
      parsed.searchParams.set("height", String(Math.round(options.height)));
    }
    parsed.searchParams.set("resize", options.resize ?? "cover");
    parsed.searchParams.set("quality", String(options.quality ?? 70));
    return parsed.toString();
  } catch {
    return url;
  }
}
