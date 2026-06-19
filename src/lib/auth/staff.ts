import type { Profile } from "@/lib/types/database";

export function isStaffRole(role?: string | null): boolean {
  return role === "admin" || role === "superadmin";
}

export function isStaffProfile(profile: Pick<Profile, "role">): boolean {
  return isStaffRole(profile.role);
}
