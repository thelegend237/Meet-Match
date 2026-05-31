export const USER_HOME = "/decouvrir";
export const ADMIN_HOME = "/admin";
export const PUBLIC_HOME = "/";

export function getHomeForRole(role?: string | null): string {
  if (role === "admin" || role === "superadmin") return ADMIN_HOME;
  return USER_HOME;
}
