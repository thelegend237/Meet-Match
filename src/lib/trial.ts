import type { Profile } from "@/lib/types/database";

/** Durée de l'essai gratuit pour chaque nouvel inscrit. */
export const TRIAL_DAYS = 14;

export function isProfileOnTrial(
  profile: Pick<Profile, "trial_ends_at" | "registration_payment_status"> | null | undefined,
  now = new Date()
): boolean {
  if (!profile?.trial_ends_at) return false;
  if (profile.registration_payment_status !== "free") return false;
  const end = new Date(profile.trial_ends_at);
  if (Number.isNaN(end.getTime())) return false;
  return end.getTime() > now.getTime();
}

export function getTrialDaysRemaining(
  profile: Pick<Profile, "trial_ends_at"> | null | undefined,
  now = new Date()
): number {
  if (!profile?.trial_ends_at) return 0;
  const end = new Date(profile.trial_ends_at);
  if (Number.isNaN(end.getTime())) return 0;
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

export function formatTrialEndDate(
  profile: Pick<Profile, "trial_ends_at"> | null | undefined
): string | null {
  if (!profile?.trial_ends_at) return null;
  const end = new Date(profile.trial_ends_at);
  if (Number.isNaN(end.getTime())) return null;
  return end.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
