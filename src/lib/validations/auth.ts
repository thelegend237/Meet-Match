import { z } from "zod";

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

export const COUNTRIES = [
  { code: "FR", name: "France", currency: "EUR" },
  { code: "BE", name: "Belgique", currency: "EUR" },
  { code: "CH", name: "Suisse", currency: "EUR" },
  { code: "LU", name: "Luxembourg", currency: "EUR" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "US", name: "États-Unis", currency: "USD" },
  { code: "CM", name: "Cameroun", currency: "EUR" },
  { code: "CI", name: "Côte d'Ivoire", currency: "EUR" },
  { code: "SN", name: "Sénégal", currency: "EUR" },
] as const;
