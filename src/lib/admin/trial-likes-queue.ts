import { createClient } from "@/lib/supabase/server";

export type TrialLikesQueueItem = {
  id: string;
  display_name: string;
  likes_sent: number;
  profile_completion: number;
  trial_ends_at: string;
  days_left: number;
};

/**
 * Membres en essai avec likes envoyés et aucun match en cours —
 * priorité matching humain (rétention).
 */
export async function getTrialUsersWithUnprocessedLikes(
  limit = 12
): Promise<TrialLikesQueueItem[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { data: trialUsers } = await supabase
    .from("profiles")
    .select("id, display_name, profile_completion, trial_ends_at")
    .eq("role", "user")
    .eq("is_deleted", false)
    .eq("registration_payment_status", "free")
    .not("trial_ends_at", "is", null)
    .gt("trial_ends_at", now)
    .order("trial_ends_at", { ascending: true })
    .limit(200);

  if (!trialUsers?.length) return [];

  const ids = new Set(trialUsers.map((u) => u.id));

  const [{ data: likes }, { data: matches }] = await Promise.all([
    supabase
      .from("likes")
      .select("from_user_id")
      .in("from_user_id", [...ids]),
    supabase
      .from("matches")
      .select("user_a_id, user_b_id, status")
      .in("status", ["pending", "pending_payment", "active"]),
  ]);

  const likesSent = new Map<string, number>();
  for (const l of likes ?? []) {
    if (!ids.has(l.from_user_id)) continue;
    likesSent.set(l.from_user_id, (likesSent.get(l.from_user_id) ?? 0) + 1);
  }

  const hasOpenMatch = new Set<string>();
  for (const m of matches ?? []) {
    if (ids.has(m.user_a_id)) hasOpenMatch.add(m.user_a_id);
    if (ids.has(m.user_b_id)) hasOpenMatch.add(m.user_b_id);
  }

  const nowMs = Date.now();
  return trialUsers
    .map((u) => {
      const sent = likesSent.get(u.id) ?? 0;
      if (sent < 1 || hasOpenMatch.has(u.id)) return null;
      const end = new Date(u.trial_ends_at!).getTime();
      const days_left = Math.max(0, Math.ceil((end - nowMs) / 86_400_000));
      return {
        id: u.id,
        display_name: u.display_name || "Membre",
        likes_sent: sent,
        profile_completion: u.profile_completion ?? 0,
        trial_ends_at: u.trial_ends_at!,
        days_left,
      } satisfies TrialLikesQueueItem;
    })
    .filter((x): x is TrialLikesQueueItem => x !== null)
    .sort((a, b) => a.days_left - b.days_left || b.likes_sent - a.likes_sent)
    .slice(0, limit);
}
