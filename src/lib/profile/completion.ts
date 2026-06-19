/** Miroir client de `calculate_profile_completion` (Supabase). */
export type ProfileCompletionInput = {
  display_name?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  country_code?: string | null;
  city?: string | null;
  bio?: string | null;
  expectations?: string | null;
  relationship_type?: string | null;
  preferred_age_min?: number | null;
  preferred_age_max?: number | null;
  preferred_relation_scope?: string | null;
  primary_photo_url?: string | null;
  languages?: string[] | null;
  language?: string | null;
  phone?: string | null;
};

export function calculateProfileCompletion(
  p: ProfileCompletionInput
): number {
  let score = 0;

  if (p.display_name?.trim()) score += 5;
  if (p.date_of_birth) score += 5;
  if (p.gender) score += 5;

  if (p.country_code) score += 8;
  if (p.city?.trim()) score += 7;

  if (p.bio && p.bio.trim().length >= 20) score += 15;

  if (p.expectations && p.expectations.trim().length >= 10) score += 8;
  if (p.relationship_type) score += 7;

  if (p.preferred_age_min != null && p.preferred_age_max != null) score += 8;
  if (p.preferred_relation_scope) score += 7;

  if (p.primary_photo_url?.trim()) score += 15;

  if (p.languages?.length || p.language) score += 5;
  if (p.phone?.trim()) score += 5;

  return Math.min(score, 100);
}

export const COMPLETION_HINTS = [
  { label: "Identité", fields: ["date_of_birth", "gender"] as const },
  { label: "Bio détaillée (20+ caractères)", fields: ["bio"] as const },
  { label: "Attentes & type de relation", fields: ["expectations", "relationship_type"] as const },
  { label: "Préférences de recherche", fields: ["preferred_age_min", "preferred_relation_scope"] as const },
  { label: "Photo principale", fields: ["primary_photo_url"] as const },
  { label: "Téléphone & langues", fields: ["phone", "languages"] as const },
] as const;
