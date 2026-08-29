import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AdminStats } from "@/components/admin/admin-stats";
import { REAL_PAYMENT_PROVIDERS } from "@/lib/payments/providers";

async function fetchAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const liveUsers = () =>
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "user")
      .eq("is_deleted", false);

  const [
    { count: totalUsers },
    { count: activeUsers },
    { count: newUsers },
    { count: incompleteProfiles },
    { count: matchesPending },
    { count: matchesActive },
    { count: matchesSuccess },
    { count: matchesFailed },
    { data: regPayments },
    { data: matchPayments },
  ] = await Promise.all([
    liveUsers(),
    liveUsers().eq("status", "active"),
    liveUsers().gte("created_at", startOfMonth.toISOString()),
    liveUsers().lt("profile_completion", 80),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_payment")
      .is("deleted_at", null),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .is("deleted_at", null),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("status", "success")
      .is("deleted_at", null),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .in("status", ["failed", "cancelled"])
      .is("deleted_at", null),
    supabase
      .from("payments")
      .select("amount")
      .eq("type", "registration")
      .eq("status", "paid")
      .in("provider", REAL_PAYMENT_PROVIDERS),
    supabase
      .from("payments")
      .select("amount")
      .eq("type", "matching")
      .eq("status", "paid")
      .in("provider", REAL_PAYMENT_PROVIDERS),
  ]);

  const revenueRegistration =
    regPayments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const revenueMatching =
    matchPayments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;

  return {
    totalUsers: totalUsers ?? 0,
    activeUsers: activeUsers ?? 0,
    newUsers: newUsers ?? 0,
    incompleteProfiles: incompleteProfiles ?? 0,
    matchesPending: matchesPending ?? 0,
    matchesActive: matchesActive ?? 0,
    matchesSuccess: matchesSuccess ?? 0,
    matchesFailed: matchesFailed ?? 0,
    revenueRegistration,
    revenueMatching,
  };
}

export const getAdminStats = unstable_cache(fetchAdminStats, ["admin-stats"], {
  revalidate: 30,
});
