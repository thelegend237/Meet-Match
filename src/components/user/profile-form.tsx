"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProfileCompletionBar } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { updateProfile } from "@/lib/actions/profile";
import {
  profileSchema,
  GENDER_LABELS,
  RELATIONSHIP_LABELS,
  SCOPE_LABELS,
  type ProfileFormData,
} from "@/lib/validations/profile";
import { COUNTRIES } from "@/lib/validations/auth";
import type { Profile } from "@/lib/types/database";

interface ProfileFormProps {
  profile: Profile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile.display_name,
      phone: profile.phone ?? "",
      date_of_birth: profile.date_of_birth ?? "",
      gender: profile.gender ?? undefined,
      country_code: profile.country_code ?? "FR",
      city: profile.city ?? "",
      language: profile.language ?? "fr",
      bio: profile.bio ?? "",
      expectations: profile.expectations ?? "",
      relationship_type: profile.relationship_type ?? undefined,
      preferred_age_min: profile.preferred_age_min ?? undefined,
      preferred_age_max: profile.preferred_age_max ?? undefined,
      preferred_country_code: profile.preferred_country_code ?? "",
      preferred_city: profile.preferred_city ?? "",
      preferred_relation_scope: profile.preferred_relation_scope ?? undefined,
    },
  });

  function onSubmit(data: ProfileFormData) {
    startTransition(async () => {
      const result = await updateProfile(data);
      if (result.error) {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      } else {
        toast({ title: "Profil mis à jour", description: "Vos modifications ont été enregistrées." });
      }
    });
  }

  const selectClass =
    "flex h-11 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      <div className="rounded-xl border border-border bg-card p-5">
        <ProfileCompletionBar value={profile.profile_completion} />
      </div>

      <section className="space-y-4">
        <h2 className="font-serif text-lg font-semibold text-primary">Identité</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="display_name">Nom affiché *</Label>
            <Input id="display_name" {...register("display_name")} />
            {errors.display_name && (
              <p className="text-sm text-destructive">{errors.display_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="date_of_birth">Date de naissance</Label>
            <Input id="date_of_birth" type="date" {...register("date_of_birth")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Genre</Label>
            <select id="gender" className={selectClass} {...register("gender")}>
              <option value="">—</option>
              {Object.entries(GENDER_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" type="tel" {...register("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">Langue</Label>
            <select id="language" className={selectClass} {...register("language")}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-lg font-semibold text-primary">Localisation</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="country_code">Pays *</Label>
            <select id="country_code" className={selectClass} {...register("country_code")}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Ville *</Label>
            <Input id="city" {...register("city")} />
            {errors.city && (
              <p className="text-sm text-destructive">{errors.city.message}</p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-lg font-semibold text-primary">Présentation</h2>
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" placeholder="Parlez de vous..." {...register("bio")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expectations">Attentes</Label>
          <Textarea id="expectations" placeholder="Ce que vous recherchez..." {...register("expectations")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="relationship_type">Type de relation</Label>
          <select id="relationship_type" className={selectClass} {...register("relationship_type")}>
            <option value="">—</option>
            {Object.entries(RELATIONSHIP_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-lg font-semibold text-primary">Préférences</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="preferred_age_min">Âge minimum recherché</Label>
            <Input id="preferred_age_min" type="number" min={18} {...register("preferred_age_min")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_age_max">Âge maximum recherché</Label>
            <Input id="preferred_age_max" type="number" min={18} {...register("preferred_age_max")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_relation_scope">Portée de recherche</Label>
            <select id="preferred_relation_scope" className={selectClass} {...register("preferred_relation_scope")}>
              <option value="">—</option>
              {Object.entries(SCOPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferred_country_code">Pays préféré</Label>
            <select id="preferred_country_code" className={selectClass} {...register("preferred_country_code")}>
              <option value="">—</option>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="preferred_city">Ville préférée</Label>
            <Input id="preferred_city" {...register("preferred_city")} />
          </div>
        </div>
      </section>

      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Enregistrer les modifications
      </Button>
    </form>
  );
}
