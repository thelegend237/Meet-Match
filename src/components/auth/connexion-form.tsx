"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, LogIn, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { resolvePostLoginPath } from "@/lib/auth/routes";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { SocialAuthButtons, AuthDivider } from "@/components/auth/social-auth-buttons";
import { AuthFormCard } from "@/components/auth/auth-page-shell";
import {
  IconInput,
  PasswordField,
  PrimaryFormButton,
} from "@/components/public/inscription/inscription-ui";

export function ConnexionForm() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const authError = searchParams.get("error") === "auth";
  const accountDeleted = searchParams.get("deleted") === "1";

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (authError) {
      toast({
        variant: "destructive",
        title: "Lien expiré ou invalide",
        description: "Veuillez vous reconnecter ou redemander un lien.",
      });
    }
  }, [authError]);

  useEffect(() => {
    if (accountDeleted) {
      toast({
        title: "Compte supprimé",
        description: "Votre compte a été désactivé. Merci d'avoir utilisé Meet & Match.",
      });
    }
  }, [accountDeleted]);

  async function onSubmit(data: LoginFormData) {
    setIsSubmitting(true);
    const supabase = createClient();

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        if (error.message.includes("Invalid login")) {
          throw new Error("Email ou mot de passe incorrect.");
        }
        if (
          error.message.toLowerCase().includes("fetch") ||
          error.message.toLowerCase().includes("network")
        ) {
          throw new Error(
            "Impossible de joindre le serveur. Vérifiez votre connexion internet et réessayez."
          );
        }
        throw new Error(error.message);
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_deleted, status")
        .eq("id", authData.user.id)
        .single();

      if (profileError) {
        console.error("[connexion] profile:", profileError.message);
      }

      if (profile?.is_deleted || profile?.status === "deleted") {
        await supabase.auth.signOut();
        throw new Error("Ce compte a été supprimé.");
      }

      const destination = resolvePostLoginPath(
        profile?.role,
        searchParams.get("redirect")
      );

      window.location.assign(destination);
      return;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Impossible de se connecter.";
      const isNetwork =
        message.toLowerCase().includes("fetch") ||
        message.toLowerCase().includes("network") ||
        message.toLowerCase().includes("failed to fetch");

      toast({
        variant: "destructive",
        title: "Erreur de connexion",
        description: isNetwork
          ? "Connexion au serveur impossible. Vérifiez internet, attendez quelques secondes et réessayez."
          : message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthFormCard
      title="Connexion"
      subtitle="Accédez à votre espace Meet & Match."
      icon={LogIn}
      footer={
        <p className="text-center text-sm text-[#6b5f7a]">
          Pas encore de compte ?{" "}
          <Link
            href="/inscription"
            className="font-semibold text-[#e91e8c] hover:underline"
          >
            S&apos;inscrire
          </Link>
        </p>
      }
    >
      {authError && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Le lien de connexion a expiré. Réessayez avec votre email ou un
            compte social.
          </span>
        </div>
      )}

      <SocialAuthButtons disabled={isSubmitting} className="mb-1" />

      <AuthDivider />

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

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-[#2e1a47]">
              Mot de passe
            </span>
            <Link
              href="/mot-de-passe-oublie"
              className="text-xs font-semibold text-[#e91e8c] hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <PasswordField
                label=""
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Votre mot de passe"
                autoComplete="current-password"
                showStrength={false}
              />
            )}
          />
          {errors.password && (
            <p className="mt-1.5 text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

        <PrimaryFormButton type="submit" pending={isSubmitting}>
          Se connecter
        </PrimaryFormButton>
      </form>
    </AuthFormCard>
  );
}
