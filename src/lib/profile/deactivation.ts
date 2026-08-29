import type { Profile } from "@/lib/types/database";

/** Compte mis en pause après un match marqué réussi par l'admin. */
export function isDeactivatedAfterMatchSuccess(profile: Profile): boolean {
  return (
    profile.status === "inactive" &&
    profile.deactivation_reason === "match_success"
  );
}

export const DEACTIVATED_MEMBER_ROUTES = [
  "/tableau-de-bord",
  "/profil",
  "/contact",
  "/notifications",
] as const;

export function isRouteAllowedWhenDeactivated(pathname: string): boolean {
  return DEACTIVATED_MEMBER_ROUTES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
