import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  USER_HOME,
  ADMIN_HOME,
  LOGIN_PATH,
  getHomeForRole,
  safeRedirectPath,
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

function redirectToLogin(request: NextRequest, returnPath?: string) {
  const url = request.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.search = "";
  const safe = safeRedirectPath(returnPath ?? null);
  if (safe) url.searchParams.set("redirect", safe);
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const cookies = request.cookies.getAll();
  const hasSessionCookie = hasSupabaseAuthCookie(cookies);

  const isUserRoute = USER_PREFIXES.some((p) => pathname.startsWith(p));
  const isAdminRoute = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPath = AUTH_PATHS.includes(pathname);
  const isLoginPage = pathname === LOGIN_PATH;

  if (!hasSessionCookie) {
    if (isUserRoute || isAdminRoute) {
      return redirectToLogin(request, pathname);
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

  if (authUnavailable && (isUserRoute || isAdminRoute)) {
    return redirectToLogin(request, pathname);
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
    return redirectToLogin(request, pathname);
  }

  if (user) {
    const profile = await getProfileRole();

    if (profile?.is_deleted || profile?.status === "deleted") {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = LOGIN_PATH;
      url.searchParams.set("error", "auth");
      return NextResponse.redirect(url);
    }

    const home = getHomeForRole(profile?.role);
    const postLogin = safeRedirectPath(
      request.nextUrl.searchParams.get("redirect")
    );

    if (pathname === "/inscription") {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      url.searchParams.set("step", "gender");
      return NextResponse.redirect(url);
    }

    if (isLoginPage || (isAuthPath && pathname !== "/inscription")) {
      const url = request.nextUrl.clone();
      url.pathname = postLogin ?? home;
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = postLogin ?? home;
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
