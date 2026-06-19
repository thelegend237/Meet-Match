import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStaleAuthError } from "@/lib/supabase/auth-errors";
import { USER_HOME } from "@/lib/auth/routes";
import type { Profile } from "@/lib/types/database";

async function clearBrokenAuthSession() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
}

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      if (isStaleAuthError(error)) {
        await clearBrokenAuthSession();
      }
      return null;
    }
    if (!user) return null;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return data as Profile | null;
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes("Dynamic server usage") ||
        (err as Error & { digest?: string }).digest === "DYNAMIC_SERVER_USAGE")
    ) {
      throw err;
    }
    console.error("[session] getCurrentProfile:", err);
    await clearBrokenAuthSession();
    return null;
  }
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
    redirect(USER_HOME);
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
