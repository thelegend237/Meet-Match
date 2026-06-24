"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function revalidateChatPaths(chatId: string) {
  revalidatePath("/messages");
  revalidatePath(`/messages/${chatId}`);
  revalidatePath("/admin/conversations");
  revalidatePath(`/admin/conversations/${chatId}`);
}

export async function hideChatForUserAction(chatId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "Non authentifié" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("hide_chat_for_user", {
    p_chat_id: chatId,
  });

  if (error) return { error: error.message };

  revalidateChatPaths(chatId);
  return { success: true };
}

export async function adminSoftDeleteChatAction(chatId: string) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "superadmin"].includes(profile.role)) {
    return { error: "Accès refusé" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_soft_delete_chat", {
    p_chat_id: chatId,
  });

  if (error) return { error: error.message };

  revalidateChatPaths(chatId);
  revalidatePath("/admin");
  return { success: true };
}

export async function superadminHardDeleteChatAction(chatId: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "superadmin") {
    return { error: "Seul un super administrateur peut supprimer définitivement." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("superadmin_hard_delete_chat", {
    p_chat_id: chatId,
  });

  if (error) return { error: error.message };

  revalidateChatPaths(chatId);
  revalidatePath("/admin");
  return { success: true };
}

export type MemberChatSearchResult = {
  id: string;
  display_name: string;
  email: string;
  primary_photo_url: string | null;
  city: string | null;
};

async function assertAdminMembersAccess() {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "superadmin"].includes(profile.role)) {
    return { error: "Accès refusé" as const, profile: null };
  }
  return { error: null, profile };
}

/** Tous les membres du site — pour le panneau « Nouvelle discussion » admin. */
export async function listMembersForNewChatAction(): Promise<{
  error?: string;
  members: MemberChatSearchResult[];
}> {
  const auth = await assertAdminMembersAccess();
  if (auth.error) return { error: auth.error, members: [] };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email, primary_photo_url, city")
    .eq("is_deleted", false)
    .eq("role", "user")
    .order("display_name", { ascending: true })
    .limit(500);

  if (error) return { error: error.message, members: [] };

  return { members: (data ?? []) as MemberChatSearchResult[] };
}

export async function searchMembersForNewChatAction(
  query: string
): Promise<{ error?: string; members: MemberChatSearchResult[] }> {
  const auth = await assertAdminMembersAccess();
  if (auth.error) return { error: auth.error, members: [] };

  const trimmed = query.trim();
  if (!trimmed) {
    return listMembersForNewChatAction();
  }

  const supabase = await createClient();
  const pattern = `%${trimmed.replace(/[%_]/g, "")}%`;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email, primary_photo_url, city")
    .eq("is_deleted", false)
    .eq("role", "user")
    .or(`display_name.ilike.${pattern},email.ilike.${pattern}`)
    .order("display_name", { ascending: true })
    .limit(100);

  if (error) return { error: error.message, members: [] };

  return { members: (data ?? []) as MemberChatSearchResult[] };
}
