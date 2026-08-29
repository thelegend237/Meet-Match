"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import {
  buildMatchProposalPair,
  getMatchingCandidateById,
  searchMatchingCandidates,
} from "@/lib/admin/matching";
import { buildMatchProposalFees } from "@/lib/admin/match-fees";
import type { MatchProposalSource } from "@/lib/types/database";
import type { Profile } from "@/lib/types/database";

async function getAdminProfile() {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "superadmin"].includes(profile.role)) {
    return {
      error: "Session expirée ou accès refusé. Reconnectez-vous.",
      profile: null,
    };
  }
  return { error: null, profile };
}

export async function getMatchingCandidateAction(userId: string) {
  const { error: authError } = await getAdminProfile();
  if (authError) return { error: authError, candidate: null };

  const candidate = await getMatchingCandidateById(userId);
  if (!candidate) {
    return { error: "Membre introuvable.", candidate: null };
  }

  return { candidate, error: null };
}

export async function searchMatchingCandidatesAction(
  query: string,
  excludeUserId?: string
) {
  const { error: authError } = await getAdminProfile();
  if (authError) return { error: authError, candidates: [] };

  const candidates = await searchMatchingCandidates(query, excludeUserId);
  return { candidates, error: null };
}

export async function loadMatchProposalPairAction(
  userAId: string,
  userBId: string
) {
  const { error: authError } = await getAdminProfile();
  if (authError) return { error: authError, pair: null };

  const pair = await buildMatchProposalPair(userAId, userBId, "manual");
  if (!pair) {
    return {
      error:
        "Impossible de charger ce couple (profil manquant, match existant ou mise en relation déjà en cours pour l'un des membres).",
      pair: null,
    };
  }

  return { pair, error: null };
}

export async function proposeMatchAction(
  userAId: string,
  userBId: string,
  options?: {
    source?: MatchProposalSource;
    likedByUserId?: string;
  }
) {
  const { error: authError, profile: admin } = await getAdminProfile();
  if (authError || !admin) return { error: authError! };

  const supabase = await createClient();
  const source = options?.source ?? "manual";

  const { data: participants } = await supabase
    .from("profiles")
    .select(
      "id, role, display_name, country_code, trial_ends_at, registration_payment_status"
    )
    .in("id", [userAId, userBId]);

  if (!participants || participants.length !== 2) {
    return { error: "Profils introuvables." };
  }

  const nonMember = participants.find((p) => p.role !== "user");
  if (nonMember) {
    return {
      error: `Impossible de proposer un match avec un compte équipe (${nonMember.display_name ?? "admin"}). Utilisez deux comptes membres.`,
    };
  }

  const profileA = participants.find((p) => p.id === userAId)!;
  const profileB = participants.find((p) => p.id === userBId)!;
  const { feeA, feeB, liableA, liableB } = buildMatchProposalFees(
    profileA,
    profileB,
    userAId,
    userBId,
    source,
    options?.likedByUserId
  );

  const { data, error } = await supabase.rpc("propose_match", {
    p_admin_id: admin.id,
    p_user_a_id: userAId,
    p_user_b_id: userBId,
    p_amount_a: feeA.amount,
    p_currency_a: feeA.currency,
    p_amount_b: feeB.amount,
    p_currency_b: feeB.currency,
    p_liable_a: liableA,
    p_liable_b: liableB,
    p_source: source,
  });

  if (error) {
    if (error.message.includes("mise en relation en cours")) {
      return {
        error:
          "Impossible de proposer ce match : l'un des deux membres a déjà une mise en relation en cours (paiement ou discussion active).",
      };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/matchs");
  revalidatePath("/admin");
  revalidatePath("/decouvrir");
  revalidatePath("/matchs");
  revalidatePath("/notifications");
  return { success: true, matchId: data };
}

export async function updateMatchStatusAction(
  matchId: string,
  status: "success" | "failed" | "cancelled"
) {
  const { error: authError, profile: admin } = await getAdminProfile();
  if (authError || !admin) return { error: authError! };

  const supabase = await createClient();

  const { error } = await supabase.rpc("update_match_status", {
    p_admin_id: admin.id,
    p_match_id: matchId,
    p_status: status,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/matchs");
  revalidatePath("/admin");
  revalidatePath("/decouvrir");
  revalidatePath("/tableau-de-bord");
  revalidatePath("/profil");
  return { success: true };
}

export async function remindMatchingPaymentAction(
  matchId: string,
  userId: string
) {
  const { error: authError, profile: admin } = await getAdminProfile();
  if (authError || !admin) return { error: authError! };

  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_remind_matching_payment", {
    p_admin_id: admin.id,
    p_match_id: matchId,
    p_user_id: userId,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/matchs");
  revalidatePath("/admin/paiements");
  revalidatePath("/notifications");
  revalidatePath("/matchs");
  return { success: true };
}

function revalidateMatchPaths() {
  revalidatePath("/admin/matchs");
  revalidatePath("/admin");
  revalidatePath("/matchs");
  revalidatePath("/decouvrir");
  revalidatePath("/rencontres");
  revalidatePath("/notifications");
}

export async function softDeleteMatchAction(matchId: string) {
  const { error: authError } = await getAdminProfile();
  if (authError) return { error: authError };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_soft_delete_match", {
    p_match_id: matchId,
  });

  if (error) return { error: error.message };

  revalidateMatchPaths();
  return { success: true };
}

export async function hardDeleteMatchAction(matchId: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "superadmin") {
    return { error: "Réservé aux super administrateurs." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("superadmin_hard_delete_match", {
    p_match_id: matchId,
  });

  if (error) return { error: error.message };

  revalidateMatchPaths();
  return { success: true };
}

export async function remindPaymentAction(paymentId: string) {
  const { error: authError, profile: admin } = await getAdminProfile();
  if (authError || !admin) return { error: authError! };

  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_remind_payment", {
    p_admin_id: admin.id,
    p_payment_id: paymentId,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/paiements");
  revalidatePath("/admin/matchs");
  revalidatePath("/notifications");
  revalidatePath("/paiements");
  revalidatePath("/matchs");
  return { success: true };
}

export async function grantFreeAccessAction(
  userId: string,
  accessType: "registration" | "matching" | "full"
) {
  const { error: authError, profile: admin } = await getAdminProfile();
  if (authError || !admin) return { error: authError! };

  const supabase = await createClient();

  const { error } = await supabase.rpc("grant_free_access", {
    p_admin_id: admin.id,
    p_user_id: userId,
    p_access_type: accessType,
    p_reason: "Accordé par administrateur",
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/utilisateurs");
  return { success: true };
}

export async function deleteUserProfileAction(userId: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "superadmin") {
    return { error: "Seul un super administrateur peut supprimer un profil." };
  }

  if (userId === profile.id) {
    return { error: "Vous ne pouvez pas supprimer votre propre compte depuis l'admin." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("admin_delete_user", {
    p_superadmin_id: profile.id,
    p_user_id: userId,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/utilisateurs");
  revalidatePath("/admin");
  revalidatePath("/admin/matchs");
  revalidatePath("/admin/conversations");
  return { success: true };
}

export async function updateUserRoleAction(
  userId: string,
  role: "user" | "admin" | "superadmin"
) {
  const { error: authError, profile: admin } = await getAdminProfile();
  if (authError || !admin) return { error: authError! };

  if (userId === admin.id) {
    return { error: "Vous ne pouvez pas modifier votre propre rôle." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("update_user_role", {
    p_admin_id: admin.id,
    p_user_id: userId,
    p_role: role,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/utilisateurs");
  revalidatePath(`/admin/utilisateurs/${userId}`);
  revalidatePath("/admin");
  return { success: true };
}

export async function updateChatStatusAction(
  chatId: string,
  status: "open" | "closed"
) {
  const { error: authError, profile: admin } = await getAdminProfile();
  if (authError || !admin) return { error: authError! };

  const supabase = await createClient();

  const { error } = await supabase
    .from("chats")
    .update({
      status,
      closed_at: status === "closed" ? new Date().toISOString() : null,
    })
    .eq("id", chatId);

  if (error) return { error: error.message };

  revalidatePath(`/admin/conversations/${chatId}`);
  revalidatePath("/admin/conversations");
  return { success: true };
}

export async function reactivateUserAction(userId: string) {
  const { error: authError, profile: admin } = await getAdminProfile();
  if (authError || !admin) return { error: authError! };

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_reactivate_user", {
    p_admin_id: admin.id,
    p_user_id: userId,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/utilisateurs");
  revalidatePath(`/admin/utilisateurs/${userId}`);
  revalidatePath("/tableau-de-bord");
  revalidatePath("/decouvrir");
  revalidatePath("/notifications");
  return { success: true };
}

