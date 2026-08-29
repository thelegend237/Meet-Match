import type { ProfileCompletionInput } from "@/lib/profile/completion";

/** Champs requis pour alimenter l'algorithme de compatibilité. */
export type MatchingProfileInput = ProfileCompletionInput & {
  preferred_gender?: string | null;
};

export function isMatchingProfileComplete(p: MatchingProfileInput): boolean {
  return (
    !!p.gender &&
    !!p.date_of_birth &&
    !!p.country_code &&
    !!p.city?.trim() &&
    !!p.bio &&
    p.bio.trim().length >= 20 &&
    !!p.relationship_type &&
    !!p.preferred_gender &&
    p.preferred_age_min != null &&
    p.preferred_age_max != null &&
    !!p.preferred_relation_scope &&
    !!p.primary_photo_url?.trim()
  );
}
