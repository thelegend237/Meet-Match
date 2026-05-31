"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncProfileGeolocation } from "@/lib/actions/geocode";
import {
  onboardingIdentitySchema,
  onboardingPresentationSchema,
  onboardingPreferencesSchema,
  type OnboardingIdentityData,
  type OnboardingPresentationData,
  type OnboardingPreferencesData,
} from "@/lib/validations/onboarding";

async function getUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

function revalidateProfilePaths() {
  revalidatePath("/onboarding");
  revalidatePath("/profil");
  revalidatePath("/profil/modifier");
  revalidatePath("/tableau-de-bord");
  revalidatePath("/decouvrir");
  revalidatePath("/paiements");
}

export async function saveOnboardingIdentity(data: OnboardingIdentityData) {
  const parsed = onboardingIdentitySchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Données invalides" };
  }

  const { supabase, userId } = await getUserId();
  if (!userId) return { error: "Non authentifié" };

  const d = parsed.data;
  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      date_of_birth: d.date_of_birth || null,
      gender: d.gender || null,
      language: d.language || "fr",
      phone: d.phone || null,
    })
    .eq("id", userId)
    .select("profile_completion")
    .single();

  if (error) return { error: error.message };
  revalidateProfilePaths();
  return { success: true, profile_completion: profile.profile_completion };
}

export async function saveOnboardingPresentation(
  data: OnboardingPresentationData
) {
  const parsed = onboardingPresentationSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Données invalides" };
  }

  const { supabase, userId } = await getUserId();
  if (!userId) return { error: "Non authentifié" };

  const d = parsed.data;
  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      bio: d.bio?.trim() || null,
      expectations: d.expectations?.trim() || null,
      relationship_type: d.relationship_type || null,
    })
    .eq("id", userId)
    .select("profile_completion")
    .single();

  if (error) return { error: error.message };
  revalidateProfilePaths();
  return { success: true, profile_completion: profile.profile_completion };
}

export async function saveOnboardingPreferences(
  data: OnboardingPreferencesData
) {
  const parsed = onboardingPreferencesSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Données invalides" };
  }

  const { supabase, userId } = await getUserId();
  if (!userId) return { error: "Non authentifié" };

  const d = parsed.data;
  const min = d.preferred_age_min;
  const max = d.preferred_age_max;

  const { data: profile, error } = await supabase
    .from("profiles")
    .update({
      preferred_age_min:
        min != null && !Number.isNaN(min) ? min : null,
      preferred_age_max:
        max != null && !Number.isNaN(max) ? max : null,
      preferred_relation_scope: d.preferred_relation_scope || null,
      preferred_gender: d.preferred_gender || "both",
      preferred_country_code: d.preferred_country_code || null,
      preferred_city: d.preferred_city?.trim() || null,
    })
    .eq("id", userId)
    .select("profile_completion")
    .single();

  if (error) return { error: error.message };
  revalidateProfilePaths();
  return { success: true, profile_completion: profile.profile_completion };
}

export async function getOnboardingProfile() {
  const { supabase, userId } = await getUserId();
  if (!userId) return { error: "Non authentifié" as const };

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return { error: "Profil introuvable" };
  return { profile: data };
}

/** Géolocalise le profil après saisie ville/pays (inscription). */
export async function syncOnboardingGeolocation() {
  const result = await syncProfileGeolocation();
  if ("error" in result) {
    console.warn("[onboarding] geocode:", result.error);
  }
  revalidateProfilePaths();
  return result;
}
