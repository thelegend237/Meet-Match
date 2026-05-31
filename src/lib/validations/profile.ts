import { z } from "zod";

export const profileSchema = z.object({
  display_name: z.string().min(2, "Minimum 2 caractères"),
  phone: z.string().optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z
    .enum(["male", "female", "other", "prefer_not_say"])
    .optional()
    .or(z.literal("")),
  country_code: z.string().length(2, "Sélectionnez un pays"),
  city: z.string().min(2, "La ville est requise"),
  language: z.string().min(2),
  bio: z.string().optional().or(z.literal("")),
  expectations: z.string().optional().or(z.literal("")),
  relationship_type: z
    .enum(["serious", "friendship", "marriage", "other"])
    .optional()
    .or(z.literal("")),
  preferred_age_min: z.coerce.number().min(18).max(120).optional(),
  preferred_age_max: z.coerce.number().min(18).max(120).optional(),
  preferred_country_code: z.string().optional().or(z.literal("")),
  preferred_city: z.string().optional().or(z.literal("")),
  preferred_relation_scope: z
    .enum(["local", "national", "international"])
    .optional()
    .or(z.literal("")),
  preferred_gender: z.enum(["male", "female", "both"]).optional(),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export const GENDER_LABELS: Record<string, string> = {
  male: "Homme",
  female: "Femme",
  other: "Autre",
  prefer_not_say: "Ne pas préciser",
};

export const RELATIONSHIP_LABELS: Record<string, string> = {
  serious: "Relation sérieuse",
  friendship: "Amitié",
  marriage: "Mariage",
  other: "Autre",
};

export const SCOPE_LABELS: Record<string, string> = {
  local: "Locale",
  national: "Nationale",
  international: "Internationale",
};

export const GENDER_PREFERENCE_LABELS: Record<string, string> = {
  male: "Hommes",
  female: "Femmes",
  both: "Hommes et femmes",
};
