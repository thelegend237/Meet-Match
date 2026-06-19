export type AppUserRole = "user" | "admin" | "superadmin";

export const USER_ROLE_LABELS: Record<AppUserRole, string> = {
  user: "Membre",
  admin: "Administrateur",
  superadmin: "Super administrateur",
};

export const USER_ROLE_OPTIONS: { value: AppUserRole; label: string }[] = [
  { value: "user", label: USER_ROLE_LABELS.user },
  { value: "admin", label: USER_ROLE_LABELS.admin },
  { value: "superadmin", label: USER_ROLE_LABELS.superadmin },
];

export function roleLabel(role?: string | null): string {
  if (role === "superadmin") return USER_ROLE_LABELS.superadmin;
  if (role === "admin") return USER_ROLE_LABELS.admin;
  return USER_ROLE_LABELS.user;
}

/** Rôles qu'un acteur peut attribuer à un autre utilisateur. */
export function assignableRoles(actorRole: AppUserRole): AppUserRole[] {
  if (actorRole === "superadmin") {
    return ["user", "admin", "superadmin"];
  }
  if (actorRole === "admin") {
    return ["user", "admin"];
  }
  return [];
}

export function canManageTargetRole(
  actorRole: AppUserRole,
  targetRole: AppUserRole
): boolean {
  if (actorRole === "superadmin") return true;
  if (actorRole === "admin") return targetRole !== "superadmin";
  return false;
}
