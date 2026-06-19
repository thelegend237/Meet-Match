"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { newPasswordSchema, type NewPasswordFormData } from "@/lib/validations/auth";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const inputClass =
  "h-12 w-full rounded-xl border border-[#e8e0f0] bg-[#faf8fc] px-4 text-sm text-[#2e1a47] shadow-sm transition-colors placeholder:text-[#9b8fa8]/80 focus:border-[#e91e8c] focus:outline-none focus:ring-2 focus:ring-[#e91e8c]/20";

interface ChangePasswordFormProps {
  fromReset?: boolean;
  className?: string;
}

export function ChangePasswordForm({
  fromReset = false,
  className,
}: ChangePasswordFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
  });

  async function onSubmit(data: NewPasswordFormData) {
    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw new Error(error.message);

      reset();
      toast({
        title: fromReset ? "Mot de passe mis à jour" : "Mot de passe modifié",
        description: "Votre nouveau mot de passe est actif.",
      });
      router.push("/profil");
      router.refresh();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          err instanceof Error ? err.message : "Impossible de modifier le mot de passe.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={cn("mm-landing-panel overflow-hidden", className)}>
      <div className="h-1.5 w-full bg-gradient-to-r from-[#7b3d8f] via-[#e91e8c] to-[#f9a8d4]" />

      <div className="border-b border-[#ebe6f0]/80 bg-gradient-to-br from-white via-white to-[#fce7f3]/20 px-6 py-5 sm:px-8">
        <div className="flex items-start gap-4">
          <div className="mm-landing-icon-pink h-12 w-12 shrink-0">
            <Lock className="h-5 w-5 stroke-[1.75]" />
          </div>
          <div>
            <h2 className="font-sans text-xl font-bold text-[#2e1a47]">
              {fromReset ? "Nouveau mot de passe" : "Modifier le mot de passe"}
            </h2>
            <p className="mt-1 text-sm text-[#6b5f7a]">
              {fromReset
                ? "Choisissez un nouveau mot de passe pour sécuriser votre compte."
                : "Utilisez au moins 8 caractères, avec lettres et chiffres."}
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 bg-white px-6 py-6 sm:px-8"
      >
        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-[#2e1a47]"
          >
            Nouveau mot de passe
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            {...register("password")}
          />
          {errors.password && (
            <p className="mt-1.5 text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-semibold text-[#2e1a47]"
          >
            Confirmer le mot de passe
          </label>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="mt-1.5 text-sm text-destructive">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7b3d8f] to-[#e91e8c] text-sm font-semibold text-white shadow-lg shadow-[#e91e8c]/25 transition-all hover:brightness-105 disabled:opacity-60 sm:w-auto sm:px-8"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Enregistrer
        </button>
      </form>
    </section>
  );
}
