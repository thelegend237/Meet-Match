import { isStaffProfile } from "@/lib/auth/staff";
import type { Profile } from "@/lib/types/database";

/** Inscription non réglée — parcourir OK, liker / matchs bloqués. */
export function needsRegistrationActivation(profile: Profile): boolean {
  if (isStaffProfile(profile)) return false;
  return profile.registration_payment_status === "unpaid";
}

export function registrationActivationBlocked(profile: Profile): boolean {
  return needsRegistrationActivation(profile);
}
