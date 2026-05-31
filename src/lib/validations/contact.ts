import { z } from "zod";

export const contactSchema = z
  .object({
    name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
    email: z.string().email("Email invalide").optional().or(z.literal("")),
    phone: z.string().optional().or(z.literal("")),
    message: z
      .string()
      .min(10, "Le message doit contenir au moins 10 caractères")
      .max(2000, "Le message est trop long"),
  })
  .refine((data) => data.email || data.phone, {
    message: "Renseignez au moins un email ou un numéro de téléphone",
    path: ["email"],
  });

export type ContactFormData = z.infer<typeof contactSchema>;
