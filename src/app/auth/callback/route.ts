import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHomeForRole, safeRedirectPath } from "@/lib/auth/routes";
import { oauthDisplayName } from "@/lib/auth/oauth";

const ONBOARDING_PATH = "/onboarding?step=gender";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextParam = safeRedirectPath(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/connexion?error=auth`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback]", error.message);
    return NextResponse.redirect(`${origin}/connexion?error=auth`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/connexion?error=auth`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_deleted, status, display_name, profile_completion, gender")
    .eq("id", user.id)
    .single();

  if (profile?.is_deleted || profile?.status === "deleted") {
    await supabase.auth.signOut();
    return NextResponse.redirect(`${origin}/connexion?error=auth`);
  }

  const nameFromOAuth = oauthDisplayName(
    (user.user_metadata ?? {}) as Record<string, unknown>
  );
  if (nameFromOAuth && !profile?.display_name?.trim()) {
    await supabase
      .from("profiles")
      .update({ display_name: nameFromOAuth })
      .eq("id", user.id);
  }

  const needsOnboarding =
    !profile?.gender ||
    (profile.profile_completion ?? 0) < 40;

  const destination = needsOnboarding
    ? ONBOARDING_PATH
    : nextParam ?? getHomeForRole(profile?.role);

  return NextResponse.redirect(`${origin}${destination}`);
}
