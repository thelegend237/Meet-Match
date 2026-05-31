import { createClient } from "@/lib/supabase/server";
import type { UserMatch } from "@/lib/types/database";

export async function getUserMatches(userId: string): Promise<UserMatch[]> {
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, user_a_id, user_b_id, status, proposed_at, activated_at, closed_at, chat_id"
    )
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .order("proposed_at", { ascending: false });

  if (!matches?.length) return [];

  const matchIds = matches.map((m) => m.id);
  const partnerIds = matches.map((m) =>
    m.user_a_id === userId ? m.user_b_id : m.user_a_id
  );

  const [{ data: partners }, { data: payments }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, primary_photo_url, city, country_code")
      .in("id", partnerIds),
    supabase
      .from("payments")
      .select("id, user_id, match_id, amount, currency, status")
      .in("match_id", matchIds)
      .eq("type", "matching"),
  ]);

  const partnerById = new Map((partners ?? []).map((p) => [p.id, p]));

  const paymentsByMatch = (payments ?? []).reduce<
    Record<string, NonNullable<typeof payments>>
  >((acc, p) => {
    if (!p.match_id) return acc;
    const key = p.match_id;
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(p);
    return acc;
  }, {});

  return matches
    .map((m) => {
      const partnerId = m.user_a_id === userId ? m.user_b_id : m.user_a_id;
      const partner = partnerById.get(partnerId);
      const matchPayments = paymentsByMatch[m.id] ?? [];
      const myPayment = matchPayments.find((p) => p.user_id === userId) ?? null;
      const partnerPayment = matchPayments.find((p) => p.user_id === partnerId);
      const partnerHasPaid =
        partnerPayment?.status === "paid" || partnerPayment?.status === "free";

      if (!partner) return null;

      return {
        id: m.id,
        status: m.status,
        proposed_at: m.proposed_at,
        activated_at: m.activated_at,
        closed_at: m.closed_at,
        chat_id: m.chat_id,
        partner: {
          id: partner.id,
          display_name: partner.display_name,
          primary_photo_url: partner.primary_photo_url,
          city: partner.city,
          country_code: partner.country_code,
        },
        myPayment: myPayment
          ? {
              id: myPayment.id,
              amount: Number(myPayment.amount),
              currency: myPayment.currency,
              status: myPayment.status,
            }
          : null,
        partnerHasPaid,
      };
    })
    .filter((m): m is UserMatch => m !== null);
}

export function countPendingMatchActions(matches: UserMatch[]): number {
  return matches.filter(
    (m) =>
      m.status === "pending_payment" &&
      m.myPayment?.status === "unpaid"
  ).length;
}
