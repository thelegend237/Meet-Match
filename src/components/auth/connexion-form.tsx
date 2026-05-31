"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { getHomeForRole } from "@/lib/auth/routes";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";

export function ConnexionForm() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const authError = searchParams.get("error") === "auth";

  const {
    register,
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

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_deleted, status")
        .eq("id", authData.user.id)
        .single();

      if (profile?.is_deleted || profile?.status === "deleted") {
        await supabase.auth.signOut();
        throw new Error("Ce compte a été supprimé.");
      }

      const redirectTo = searchParams.get("redirect");
      const destination =
        redirectTo &&
        redirectTo.startsWith("/") &&
        !redirectTo.startsWith("//")
          ? redirectTo
          : getHomeForRole(profile?.role);

      // Navigation complète pour garantir l'envoi des cookies de session
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
    <Card>
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>
          Accédez à votre espace Meet & Match.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {authError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Le lien de connexion a expiré. Connectez-vous avec votre mot de passe.</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mot de passe</Label>
              <Link
                href="/mot-de-passe-oublie"
                className="text-xs text-secondary hover:underline"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" variant="secondary" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Se connecter
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-medium text-secondary hover:underline">
            S&apos;inscrire
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
