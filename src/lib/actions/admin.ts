"use server";

import { revalidatePath } from "next/cache";
import { getMatchingFee } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import {
  buildMatchProposalPair,
  getMatchingCandidateById,
  searchMatchingCandidates,
} from "@/lib/admin/matching";

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
      error: "Impossible de charger ce couple (profil manquant ou match déjà existant).",
      pair: null,
    };
  }

  return { pair, error: null };
}

export async function proposeMatchAction(userAId: string, userBId: string) {
  const { error: authError, profile: admin } = await getAdminProfile();
  if (authError || !admin) return { error: authError! };

  const supabase = await createClient();

  const { data: userA } = await supabase
    .from("profiles")
    .select("country_code")
    .eq("id", userAId)
    .single();

  const fee = getMatchingFee(userA?.country_code ?? null);

  const { data, error } = await supabase.rpc("propose_match", {
    p_admin_id: admin.id,
    p_user_a_id: userAId,
    p_user_b_id: userBId,
    p_amount: fee.amount,
    p_currency: fee.currency,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/matchs");
  revalidatePath("/admin");
  revalidatePath("/decouvrir");
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

