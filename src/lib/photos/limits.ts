/** Taille max fichier photo profil (Mo). Aligner avec migration Storage + next.config serverActions.bodySizeLimit. */
export const MAX_PROFILE_PHOTO_MB = 50;

export const MAX_PROFILE_PHOTO_BYTES = MAX_PROFILE_PHOTO_MB * 1024 * 1024;

export const ALLOWED_PROFILE_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const PROFILE_PHOTO_ACCEPT = [
  ...ALLOWED_PROFILE_PHOTO_TYPES,
  "image/*",
].join(",");

export const PROFILE_PHOTO_SIZE_ERROR = `Fichier trop volumineux (max ${MAX_PROFILE_PHOTO_MB} Mo)`;

export const PROFILE_PHOTO_FORMAT_ERROR =
  "Format non supporté (JPEG, PNG, WebP uniquement)";

export function validateProfilePhotoFile(file: File): string | null {
  if (!file.size) return "Aucun fichier sélectionné";
  if (!ALLOWED_PROFILE_PHOTO_TYPES.includes(file.type as (typeof ALLOWED_PROFILE_PHOTO_TYPES)[number])) {
    return PROFILE_PHOTO_FORMAT_ERROR;
  }
  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    return PROFILE_PHOTO_SIZE_ERROR;
  }
  return null;
}
