import { createClient } from "@/lib/supabase/server";
import type { AdminMatchRow } from "@/components/admin/matches-table";

export async function getAdminMatches(): Promise<AdminMatchRow[]> {
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select("id, user_a_id, user_b_id, status, proposed_at")
    .order("proposed_at", { ascending: false });

  if (!matches?.length) return [];

  const userIds = [
    ...new Set(matches.flatMap((m) => [m.user_a_id, m.user_b_id])),
  ];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .in("id", userIds);

  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      p.display_name || p.email || "Utilisateur",
    ])
  );

  return matches.map((m) => ({
    id: m.id,
    userAName: nameById.get(m.user_a_id) ?? "—",
    userBName: nameById.get(m.user_b_id) ?? "—",
    status: m.status,
    proposedAt: m.proposed_at,
  }));
}
