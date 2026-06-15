"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthFormCard, AuthPageShell } from "@/components/auth/auth-page-shell";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormData,
} from "@/lib/validations/auth";
import { IconInput, PrimaryFormButton } from "@/components/public/inscription/inscription-ui";

export default function MotDePasseOubliePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  async function onSubmit(data: ForgotPasswordFormData) {
    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/profil/parametres?reset=1")}`,
      });

      if (error) throw new Error(error.message);

      setSent(true);
      toast({
        title: "Email envoyé",
        description: "Consultez votre boîte mail pour réinitialiser votre mot de passe.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          err instanceof Error ? err.message : "Impossible d'envoyer l'email.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <AuthPageShell
        title={
          <>
            Email <span className="text-[#e91e8c]">envoyé</span>
          </>
        }
        subtitle="Si un compte existe avec cette adresse, vous recevrez un lien de réinitialisation."
        footer={null}
      >
        <AuthFormCard
          title="Vérifiez votre boîte mail"
          subtitle="Le lien de réinitialisation est valable pendant une durée limitée."
          icon={Mail}
        >
          <Link
            href="/connexion"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#d8cfe8] bg-white text-sm font-semibold text-[#2e1a47] shadow-sm transition-colors hover:border-[#e91e8c]/40 hover:bg-[#fdfbff]"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la connexion
          </Link>
        </AuthFormCard>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title={
        <>
          Mot de passe <span className="text-[#e91e8c]">oublié</span>
        </>
      }
      subtitle="Entrez votre email pour recevoir un lien de réinitialisation sécurisé."
      footer={null}
    >
      <AuthFormCard
        title="Réinitialiser le mot de passe"
        subtitle="Nous vous enverrons un lien par email si un compte est associé à cette adresse."
        icon={KeyRound}
        footer={
          <p className="text-center text-sm text-[#6b5f7a]">
            Vous vous souvenez ?{" "}
            <Link
              href="/connexion"
              className="font-semibold text-[#e91e8c] hover:underline"
            >
              Se connecter
            </Link>
          </p>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <IconInput
              icon={Mail}
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="vous@exemple.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1.5 text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <PrimaryFormButton type="submit" pending={isSubmitting}>
            Envoyer le lien
          </PrimaryFormButton>

          <Link
            href="/connexion"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-medium text-[#6b5f7a] transition-colors hover:text-[#2e1a47]"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </form>
      </AuthFormCard>
    </AuthPageShell>
  );
}
