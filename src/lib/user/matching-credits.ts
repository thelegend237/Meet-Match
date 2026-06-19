import { createClient } from "@/lib/supabase/server";
import { MONTHLY_FREE_MATCHES } from "@/lib/pricing";

export type MatchingCreditsStatus = {
  hasEverPaidMatching: boolean;
  monthlyAllowance: number;
  usedThisMonth: number;
  remainingThisMonth: number;
  billingMonth: string;
};

const EMPTY_STATUS: MatchingCreditsStatus = {
  hasEverPaidMatching: false,
  monthlyAllowance: MONTHLY_FREE_MATCHES,
  usedThisMonth: 0,
  remainingThisMonth: 0,
  billingMonth: new Date().toISOString().slice(0, 7) + "-01",
};

export async function getMatchingCreditsStatus(
  userId: string
): Promise<MatchingCreditsStatus> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_matching_credits_status", {
    p_user_id: userId,
  });

  if (error) {
    console.error("[matching-credits] get_matching_credits_status:", error.message);
    return EMPTY_STATUS;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return EMPTY_STATUS;

  return {
    hasEverPaidMatching: Boolean(row.has_ever_paid_matching),
    monthlyAllowance: Number(row.monthly_allowance ?? MONTHLY_FREE_MATCHES),
    usedThisMonth: Number(row.used_this_month ?? 0),
    remainingThisMonth: Number(row.remaining_this_month ?? 0),
    billingMonth: String(row.billing_month ?? EMPTY_STATUS.billingMonth),
  };
}
