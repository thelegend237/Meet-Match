import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data as Profile | null;
}

export async function requireUser(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || profile.is_deleted || profile.status === "deleted") {
    redirect("/connexion");
  }
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  const profile = await requireUser();
  if (!["admin", "superadmin"].includes(profile.role)) {
    redirect("/decouvrir");
  }
  return profile;
}

export function hasPlatformAccess(profile: Profile): boolean {
  return (
    profile.registration_payment_status === "paid" ||
    profile.registration_payment_status === "free"
  );
}

export function isAdmin(profile: Profile): boolean {
  return profile.role === "admin" || profile.role === "superadmin";
}
