import { createClient } from "@/lib/supabase/server";
import type { Payment } from "@/lib/types/database";

export type AdminMatchPayment = {
  paymentId: string;
  userId: string;
  status: Payment["status"];
  amount: number;
  currency: string;
};

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
  paymentA: AdminMatchPayment | null;
  paymentB: AdminMatchPayment | null;
}

export async function getAdminMatches(): Promise<AdminMatchRow[]> {
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select("id, user_a_id, user_b_id, status, proposed_at, chat_id")
    .order("proposed_at", { ascending: false });

  if (!matches?.length) return [];

  const matchIds = matches.map((m) => m.id);
  const userIds = [
    ...new Set(matches.flatMap((m) => [m.user_a_id, m.user_b_id])),
  ];

  const [{ data: profiles }, { data: payments }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, email, primary_photo_url")
      .in("id", userIds),
    supabase
      .from("payments")
      .select("id, user_id, match_id, amount, currency, status")
      .in("match_id", matchIds)
      .eq("type", "matching"),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const paymentsByMatchUser = new Map<string, AdminMatchPayment>();
  for (const pay of payments ?? []) {
    if (!pay.match_id) continue;
    paymentsByMatchUser.set(`${pay.match_id}:${pay.user_id}`, {
      paymentId: pay.id,
      userId: pay.user_id,
      status: pay.status as Payment["status"],
      amount: Number(pay.amount),
      currency: pay.currency,
    });
  }

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
      paymentA: paymentsByMatchUser.get(`${m.id}:${m.user_a_id}`) ?? null,
      paymentB: paymentsByMatchUser.get(`${m.id}:${m.user_b_id}`) ?? null,
    };
  });
}
