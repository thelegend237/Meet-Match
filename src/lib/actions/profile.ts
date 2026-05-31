"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { syncProfileGeolocation } from "@/lib/actions/geocode";
import { profileSchema, type ProfileFormData } from "@/lib/validations/profile";

export async function updateProfile(data: ProfileFormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Données invalides" };
  }

  const p = parsed.data;

  const { data: before } = await supabase
    .from("profiles")
    .select("city, country_code")
    .eq("id", user.id)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: p.display_name,
      phone: p.phone || null,
      date_of_birth: p.date_of_birth || null,
      gender: p.gender || null,
      country_code: p.country_code,
      city: p.city,
      language: p.language,
      bio: p.bio || null,
      expectations: p.expectations || null,
      relationship_type: p.relationship_type || null,
      preferred_age_min: p.preferred_age_min ?? null,
      preferred_age_max: p.preferred_age_max ?? null,
      preferred_country_code: p.preferred_country_code || null,
      preferred_city: p.preferred_city || null,
      preferred_relation_scope: p.preferred_relation_scope || null,
      preferred_gender: p.preferred_gender ?? "both",
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  const locationChanged =
    before?.city !== p.city || before?.country_code !== p.country_code;

  if (locationChanged) {
    const geo = await syncProfileGeolocation(user.id);
    if ("error" in geo) {
      console.warn("[profile] geocode:", geo.error);
    }
  }

  revalidatePath("/profil");
  revalidatePath("/tableau-de-bord");
  revalidatePath("/decouvrir");
  return { success: true };
}
