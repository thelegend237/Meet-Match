import type { DiscoveryProfile } from "@/lib/types/database";

export const ONLINE_THRESHOLD_MINUTES = 5;
export const NEW_MEMBER_DAYS = 30;

export function isProfileOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  return diffMs <= ONLINE_THRESHOLD_MINUTES * 60 * 1000;
}

export function isNewMember(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const days =
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24);
  return days <= NEW_MEMBER_DAYS;
}

export function isVerifiedProfile(
  profile: Pick<DiscoveryProfile, "is_verified">
): boolean {
  return profile.is_verified === true;
}

export type GenderPreference = "male" | "female" | "both";

export function filterProfilesByGender<T extends { gender: string | null }>(
  profiles: T[],
  preference: GenderPreference
): T[] {
  if (preference === "both") {
    return profiles;
  }
  return profiles.filter((p) => p.gender === preference);
}
