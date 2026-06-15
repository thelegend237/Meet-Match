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

export function getHomeForRole(role?: string | null): string {
  if (role === "admin" || role === "superadmin") return ADMIN_HOME;
  return USER_HOME;
}
