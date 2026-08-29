import { getChargeMatchingFee } from "@/lib/pricing";
import { isProfileOnTrial } from "@/lib/trial";
import type { MatchProposalSource, PaymentStatus } from "@/lib/types/database";

export type MatchFeeProfile = {
  country_code: string | null;
  trial_ends_at?: string | null;
  registration_payment_status: PaymentStatus;
};

export function matchingFeeForProfile(profile: MatchFeeProfile) {
  if (
    isProfileOnTrial({
      trial_ends_at: profile.trial_ends_at ?? null,
      registration_payment_status: profile.registration_payment_status,
    })
  ) {
    return { amount: 0, currency: "USD" as const };
  }
  return getChargeMatchingFee({ countryCode: profile.country_code });
}

/** Détermine si ce membre doit payer les frais de matching pour cette proposition. */
export function isUserLiableForMatch(
  userId: string,
  source: MatchProposalSource,
  likedByUserId?: string
): boolean {
  if (source === "one_way") {
    return Boolean(likedByUserId && userId === likedByUserId);
  }
  return true;
}

export function buildMatchProposalFees(
  profileA: MatchFeeProfile,
  profileB: MatchFeeProfile,
  userAId: string,
  userBId: string,
  source: MatchProposalSource,
  likedByUserId?: string
) {
  const liableA = isUserLiableForMatch(userAId, source, likedByUserId);
  const liableB = isUserLiableForMatch(userBId, source, likedByUserId);
  const feeA = liableA
    ? matchingFeeForProfile(profileA)
    : { amount: 0, currency: "USD" as const };
  const feeB = liableB
    ? matchingFeeForProfile(profileB)
    : { amount: 0, currency: "USD" as const };

  return { feeA, feeB, liableA, liableB };
}

export function matchFeeSummaryLabel(
  name: string,
  liable: boolean,
  amount: number,
  currency: string
): string {
  if (!liable) return `${name} : exempté (like reçu)`;
  if (amount <= 0) return `${name} : gratuit (essai / offre)`;
  return `${name} : ${amount} ${currency}`;
}
