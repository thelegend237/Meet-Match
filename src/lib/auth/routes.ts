export const USER_HOME = "/decouvrir";
export const ADMIN_HOME = "/admin";
export const PUBLIC_HOME = "/";
export const LOGIN_PATH = "/connexion";

/** Chemin interne sûr pour redirection post-login (évite open redirect). */
export function safeRedirectPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  if (
    value.startsWith("/connexion") ||
    value.startsWith("/inscription") ||
    value.startsWith("/mot-de-passe-oublie")
  ) {
    return null;
  }
  return value;
}

export function isAdminRole(role?: string | null): boolean {
  return role === "admin" || role === "superadmin";
}

export { isStaffRole } from "@/lib/auth/staff";

export function getHomeForRole(role?: string | null): string {
  if (isAdminRole(role)) return ADMIN_HOME;
  return USER_HOME;
}

/** Destination après connexion : redirect explicite, sinon accueil selon le rôle. */
export function resolvePostLoginPath(
  role?: string | null,
  redirectParam?: string | null
): string {
  return safeRedirectPath(redirectParam) ?? getHomeForRole(role);
}
