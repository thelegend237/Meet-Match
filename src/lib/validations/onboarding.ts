import { z } from "zod";
import { SPOKEN_LANGUAGE_CODES } from "@/lib/languages";
import {
  isOptionalMemberBirthDateValid,
  MEMBER_MIN_AGE_ERROR,
  meetsMinimumMemberAge,
} from "@/lib/validations/age";

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
  date_of_birth: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(isOptionalMemberBirthDateValid, {
      message: MEMBER_MIN_AGE_ERROR,
    }),
  gender: z
    .enum(["male", "female", "other", "prefer_not_say"])
    .optional()
    .or(z.literal("")),
  languages: spokenLanguagesSchema,
  phone: z.string().optional().or(z.literal("")),
});

export const onboardingBirthDateSchema = z.object({
  date_of_birth: z
    .string()
    .min(1, "La date de naissance est requise")
    .refine(meetsMinimumMemberAge, {
      message: MEMBER_MIN_AGE_ERROR,
    }),
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

/** Étapes obligatoires pour l'algorithme de compatibilité */
export const onboardingGenderStepSchema = z.object({
  gender: z.enum(["male", "female", "other", "prefer_not_say"], {
    required_error: "Sélectionnez votre genre",
  }),
});

export const onboardingBioStepSchema = z.object({
  bio: z
    .string()
    .trim()
    .min(20, "Décrivez-vous en au moins 20 caractères"),
});

export const onboardingRelationshipStepSchema = z.object({
  relationship_type: z.enum(["serious", "friendship", "marriage", "other"], {
    required_error: "Choisissez un type de relation",
  }),
});

export const onboardingSeekGenderStepSchema = z.object({
  preferred_gender: z.enum(["male", "female", "both"], {
    required_error: "Indiquez qui vous souhaitez rencontrer",
  }),
});

const requiredAgeBound = z
  .number({ required_error: "Tranche d'âge requise" })
  .min(18, "Minimum 18 ans")
  .max(120, "Maximum 120 ans");

export const onboardingAgeRangeStepSchema = z
  .object({
    preferred_age_min: requiredAgeBound,
    preferred_age_max: requiredAgeBound,
  })
  .refine((data) => data.preferred_age_min <= data.preferred_age_max, {
    message: "L'âge minimum doit être inférieur ou égal au maximum",
    path: ["preferred_age_max"],
  });

export const onboardingScopeStepSchema = z.object({
  preferred_relation_scope: z.enum(["local", "national", "international"], {
    required_error: "Choisissez une portée de recherche",
  }),
});

/** Déduit la zone recherchée à partir de la portée et de la localisation membre. */
export function resolvePreferredLocation(
  scope: "local" | "national" | "international" | "",
  countryCode: string,
  city: string
): { preferred_country_code: string; preferred_city: string } {
  if (scope === "local") {
    return {
      preferred_country_code: countryCode,
      preferred_city: city.trim(),
    };
  }
  if (scope === "national") {
    return { preferred_country_code: countryCode, preferred_city: "" };
  }
  return { preferred_country_code: "", preferred_city: "" };
}
