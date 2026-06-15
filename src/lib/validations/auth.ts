import { z } from "zod";
import { GEO_COUNTRIES } from "@/lib/geo/countries-data";

export const registerSchema = z.object({
  display_name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
  country_code: z.string().length(2, "Sélectionnez un pays"),
  city: z.string().min(2, "La ville est requise"),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

export type NewPasswordFormData = z.infer<typeof newPasswordSchema>;

function currencyForCountry(code: string): string {
  if (code === "CA") return "CAD";
  if (code === "US") return "USD";
  return "EUR";
}

/** Liste pays ISO — préférer GEO_COUNTRIES / getCountryName pour l'affichage. */
export const COUNTRIES = GEO_COUNTRIES.map((c) => ({
  code: c.code,
  name: c.name,
  currency: currencyForCountry(c.code),
})) as ReadonlyArray<{
  code: string;
  name: string;
  currency: string;
}>;
