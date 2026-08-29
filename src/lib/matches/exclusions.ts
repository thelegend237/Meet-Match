import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/** Contexte d'exclusion partagé (évite plusieurs scans de `matches` par requête). */
export const getMatchExclusionContext = cache(
  async (supabase: SupabaseServer) => {
    const [existingPairs, blockingUsers] = await Promise.all([
      getExistingMatchPairKeys(supabase),
      getUsersWithBlockingMatch(supabase),
    ]);
    return { existingPairs, blockingUsers };
  }
);

/** Statuts pour lesquels les deux personnes ne doivent plus se voir en découverte */
export const DISCOVERY_HIDDEN_MATCH_STATUSES = [
  "pending",
  "pending_payment",
  "active",
  "success",
] as const;

/** Tous les statuts — une paire ayant déjà un match ne réapparaît pas chez l'admin */
export const ALL_MATCH_STATUSES = [
  "pending",
  "pending_payment",
  "active",
  "success",
  "failed",
  "cancelled",
] as const;

/** Statuts bloquant toute nouvelle proposition de match (fidélité) */
export const BLOCKING_MATCH_STATUSES = ["pending_payment", "active"] as const;

export function matchPairKey(userAId: string, userBId: string): string {
  const [a, b] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];
  return `${a}:${b}`;
}

/** IDs des utilisateurs à masquer dans la découverte pour un membre donné */
export async function getDiscoveryExcludedUserIds(
  supabase: SupabaseServer,
  userId: string
): Promise<Set<string>> {
  const { data: matches } = await supabase
    .from("matches")
    .select("user_a_id, user_b_id, status")
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
    .in("status", [...DISCOVERY_HIDDEN_MATCH_STATUSES]);

  const excluded = new Set<string>();
  for (const m of matches ?? []) {
    const partnerId = m.user_a_id === userId ? m.user_b_id : m.user_a_id;
    excluded.add(partnerId);
  }
  return excluded;
}

/** Paires déjà présentes dans la table matches (clé normalisée user_a:user_b) */
export async function getExistingMatchPairKeys(
  supabase: SupabaseServer
): Promise<Set<string>> {
  const { data: matches } = await supabase
    .from("matches")
    .select("user_a_id, user_b_id")
    .is("deleted_at", null);

  return new Set(
    (matches ?? []).map((m) => matchPairKey(m.user_a_id, m.user_b_id))
  );
}

/** Le membre a-t-il une mise en relation en cours (fidélité) ? */
export async function userHasBlockingMatch(
  supabase: SupabaseServer,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("user_has_blocking_match", {
    p_user_id: userId,
  });
  if (error) {
    console.error("[exclusions] user_has_blocking_match:", error.message);
    return false;
  }
  return Boolean(data);
}

/** Membres ayant déjà une mise en relation en cours (paiement ou discussion active). */
export async function getUsersWithBlockingMatch(
  supabase: SupabaseServer
): Promise<Set<string>> {
  const { data: matches } = await supabase
    .from("matches")
    .select("user_a_id, user_b_id")
    .is("deleted_at", null)
    .in("status", [...BLOCKING_MATCH_STATUSES]);

  const blocked = new Set<string>();
  for (const m of matches ?? []) {
    blocked.add(m.user_a_id);
    blocked.add(m.user_b_id);
  }
  return blocked;
}
