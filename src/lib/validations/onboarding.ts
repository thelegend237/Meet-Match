import { z } from "zod";
import { SPOKEN_LANGUAGE_CODES } from "@/lib/languages";

const spokenLanguageCodeSchema = z.enum(SPOKEN_LANGUAGE_CODES);

const spokenLanguagesSchema = z.array(spokenLanguageCodeSchema).default([]);

/** Étape « Compte » : identifiants uniquement */
export const onboardingCredentialsSchema = z.object({
  display_name: z.string().min(2, "Minimum 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
});

export type OnboardingCredentialsData = z.infer<
  typeof onboardingCredentialsSchema
>;

/** Étape « Localisation » */
export const onboardingLocationSchema = z.object({
  country_code: z.string().length(2, "Sélectionnez un pays"),
  city: z.string().min(2, "La ville est requise"),
  phone: z.string().optional().or(z.literal("")),
});

export type OnboardingLocationData = z.infer<typeof onboardingLocationSchema>;

/** Création du compte (credentials + localisation) */
export const onboardingAccountSchema = onboardingCredentialsSchema.merge(
  onboardingLocationSchema
);

export type OnboardingAccountData = z.infer<typeof onboardingAccountSchema>;

export const onboardingIdentitySchema = z.object({
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z
    .enum(["male", "female", "other", "prefer_not_say"])
    .optional()
    .or(z.literal("")),
  languages: spokenLanguagesSchema,
  phone: z.string().optional().or(z.literal("")),
});

export type OnboardingIdentityData = z.infer<typeof onboardingIdentitySchema>;

export const onboardingPresentationSchema = z.object({
  bio: z.string().optional().or(z.literal("")),
  expectations: z.string().optional().or(z.literal("")),
  relationship_type: z
    .enum(["serious", "friendship", "marriage", "other"])
    .optional()
    .or(z.literal("")),
});

export type OnboardingPresentationData = z.infer<
  typeof onboardingPresentationSchema
>;

const optionalAge = z
  .union([z.string(), z.number()])
  .optional()
  .transform((val): number | undefined => {
    if (val === "" || val === undefined || val === null) return undefined;
    const n = typeof val === "number" ? val : Number(val);
    if (Number.isNaN(n)) return undefined;
    if (n < 18 || n > 120) return undefined;
    return n;
  });

export const onboardingPreferencesSchema = z
  .object({
    preferred_age_min: optionalAge,
    preferred_age_max: optionalAge,
    preferred_relation_scope: z
      .enum(["local", "national", "international"])
      .optional()
      .or(z.literal("")),
    preferred_gender: z.enum(["male", "female", "both"]).optional().or(z.literal("")),
    preferred_country_code: z.string().optional().or(z.literal("")),
    preferred_city: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      const min = data.preferred_age_min;
      const max = data.preferred_age_max;
      if (min == null || max == null || Number.isNaN(min) || Number.isNaN(max))
        return true;
      return min <= max;
    },
    { message: "L'âge minimum doit être inférieur au maximum", path: ["preferred_age_max"] }
  );

export type OnboardingPreferencesData = z.infer<
  typeof onboardingPreferencesSchema
>;
