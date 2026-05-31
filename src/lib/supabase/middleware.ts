import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  USER_HOME,
  ADMIN_HOME,
  PUBLIC_HOME,
  getHomeForRole,
} from "@/lib/auth/routes";
import {
  getSupabaseEnv,
  hasSupabaseAuthCookie,
} from "@/lib/supabase/env";

const USER_PREFIXES = [
  "/tableau-de-bord",
  "/profil",
  "/decouvrir",
  "/rencontres",
  "/notifications",
  "/paiements",
  "/matchs",
  "/messages",
  "/onboarding",
];

const ADMIN_PREFIXES = ["/admin"];
const AUTH_PATHS = ["/connexion", "/inscription", "/mot-de-passe-oublie"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const cookies = request.cookies.getAll();
  const hasSessionCookie = hasSupabaseAuthCookie(cookies);

  const isUserRoute = USER_PREFIXES.some((p) => pathname.startsWith(p));
  const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPath = AUTH_PATHS.includes(pathname);
  const isPublicLanding = pathname === PUBLIC_HOME;

  // Pas de cookie de session → pas d'appel réseau Supabase
  if (!hasSessionCookie) {
    if (isUserRoute || isAdminRoute) {
      const url = request.nextUrl.clone();
      url.pathname = PUBLIC_HOME;
      if (isUserRoute) url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  let url: string;
  let anonKey: string;
  try {
    ({ url, anonKey } = getSupabaseEnv());
  } catch (err) {
    console.error("[middleware] config Supabase:", err);
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options: CookieOptions;
        }[]
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  let user: Awaited<
    ReturnType<typeof supabase.auth.getUser>
  >["data"]["user"] = null;
  let authUnavailable = false;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.error("[middleware] auth.getUser:", error.message);
      authUnavailable = error.message.toLowerCase().includes("fetch");
    } else {
      user = data.user;
    }
  } catch (err) {
    console.error("[middleware] auth.getUser fetch failed:", err);
    authUnavailable = true;
  }

  if (authUnavailable) {
    // Cookie présent mais Supabase injoignable : laisser passer (évite de bloquer après login)
    if (isAuthPath || isPublicLanding || isUserRoute || isAdminRoute) {
      return supabaseResponse;
    }
  }

  async function getProfileRole() {
    if (!user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_deleted, status")
      .eq("id", user.id)
      .single();
    return profile;
  }

  if ((isUserRoute || isAdminRoute) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = PUBLIC_HOME;
    if (isUserRoute) url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    const profile = await getProfileRole();

    if (profile?.is_deleted || profile?.status === "deleted") {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = PUBLIC_HOME;
      return NextResponse.redirect(url);
    }

    const home = getHomeForRole(profile?.role);

    if (pathname === "/inscription") {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      url.searchParams.set("step", "gender");
      return NextResponse.redirect(url);
    }

    if (pathname.startsWith("/onboarding") && !user) {
      const url = request.nextUrl.clone();
      url.pathname = "/inscription";
      return NextResponse.redirect(url);
    }

    if (isPublicLanding || isAuthPath) {
      const url = request.nextUrl.clone();
      url.pathname = home;
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (isAdminRoute) {
      if (!profile || !["admin", "superadmin"].includes(profile.role)) {
        const url = request.nextUrl.clone();
        url.pathname = USER_HOME;
        return NextResponse.redirect(url);
      }
    }

    if (
      isUserRoute &&
      profile &&
      ["admin", "superadmin"].includes(profile.role) &&
      pathname.startsWith("/tableau-de-bord")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = ADMIN_HOME;
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
