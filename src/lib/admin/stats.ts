import { createClient } from "@/lib/supabase/server";
import type { AdminStats } from "@/components/admin/admin-stats";

export async function getAdminStats(): Promise<AdminStats> {
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
      .eq("status", "pending_payment"),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .eq("status", "success"),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .in("status", ["failed", "cancelled"]),
    supabase
      .from("payments")
      .select("amount")
      .eq("type", "registration")
      .eq("status", "paid"),
    supabase
      .from("payments")
      .select("amount")
      .eq("type", "matching")
      .eq("status", "paid"),
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
