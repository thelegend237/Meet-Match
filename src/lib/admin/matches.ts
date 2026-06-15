import { createClient } from "@/lib/supabase/server";

export interface AdminMatchRow {
  id: string;
  userAId: string;
  userBId: string;
  userAName: string;
  userBName: string;
  userAPhoto: string | null;
  userBPhoto: string | null;
  status: string;
  proposedAt: string;
  chatId: string | null;
}

export async function getAdminMatches(): Promise<AdminMatchRow[]> {
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select("id, user_a_id, user_b_id, status, proposed_at, chat_id")
    .order("proposed_at", { ascending: false });

  if (!matches?.length) return [];

  const userIds = [
    ...new Set(matches.flatMap((m) => [m.user_a_id, m.user_b_id])),
  ];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, email, primary_photo_url")
    .in("id", userIds);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return matches.map((m) => {
    const userA = profileById.get(m.user_a_id);
    const userB = profileById.get(m.user_b_id);

    return {
      id: m.id,
      userAId: m.user_a_id,
      userBId: m.user_b_id,
      userAName: userA?.display_name || userA?.email || "Utilisateur",
      userBName: userB?.display_name || userB?.email || "Utilisateur",
      userAPhoto: userA?.primary_photo_url ?? null,
      userBPhoto: userB?.primary_photo_url ?? null,
      status: m.status,
      proposedAt: m.proposed_at,
      chatId: m.chat_id,
    };
  });
}
