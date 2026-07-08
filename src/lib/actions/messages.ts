"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { markChatMessagesAsRead as markChatMessagesAsReadInDb } from "@/lib/chat/mark-read";

export async function sendMessage(
  chatId: string,
  content: string,
  replyToId?: string | null
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const trimmed = content.trim();
  if (!trimmed) return { error: "Message vide" };

  if (replyToId) {
    const { data: parent } = await supabase
      .from("messages")
      .select("id, chat_id")
      .eq("id", replyToId)
      .maybeSingle();

    if (!parent || parent.chat_id !== chatId) {
      return { error: "Message cité introuvable" };
    }
  }

  const { error } = await supabase.from("messages").insert({
    chat_id: chatId,
    sender_id: user.id,
    content: trimmed,
    reply_to_id: replyToId ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath(`/messages/${chatId}`);
  revalidatePath("/messages");
  revalidatePath(`/admin/conversations/${chatId}`);
  revalidatePath("/admin/conversations");
  return { success: true };
}

export const MESSAGE_EDIT_WINDOW_MS = 30 * 60 * 1000;

export async function editMessage(messageId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const trimmed = content.trim();
  if (!trimmed) return { error: "Message vide" };

  const { data: message } = await supabase
    .from("messages")
    .select("id, chat_id, sender_id, created_at, deleted_at")
    .eq("id", messageId)
    .maybeSingle();

  if (!message) return { error: "Message introuvable" };
  if (message.sender_id !== user.id) {
    return { error: "Vous ne pouvez modifier que vos propres messages" };
  }
  if (message.deleted_at) {
    return { error: "Ce message a été supprimé" };
  }

  const age = Date.now() - new Date(message.created_at).getTime();
  if (age > MESSAGE_EDIT_WINDOW_MS) {
    return {
      error: "La modification n'est possible que dans les 30 minutes suivant l'envoi",
    };
  }

  const { error } = await supabase
    .from("messages")
    .update({ content: trimmed, edited_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) return { error: error.message };

  revalidatePath(`/messages/${message.chat_id}`);
  revalidatePath("/messages");
  revalidatePath(`/admin/conversations/${message.chat_id}`);
  return { success: true };
}

export async function deleteMessage(messageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: message } = await supabase
    .from("messages")
    .select("id, chat_id, sender_id, deleted_at")
    .eq("id", messageId)
    .maybeSingle();

  if (!message) return { error: "Message introuvable" };
  if (message.deleted_at) return { success: true };

  const isOwner = message.sender_id === user.id;

  if (!isOwner) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const isAdmin =
      profile?.role === "admin" || profile?.role === "superadmin";
    if (!isAdmin) {
      return { error: "Vous ne pouvez supprimer que vos propres messages" };
    }
  }

  const { error } = await supabase
    .from("messages")
    .update({
      content: "Ce message a été supprimé",
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      is_pinned: false,
      pinned_at: null,
      pinned_by: null,
    })
    .eq("id", messageId);

  if (error) return { error: error.message };

  revalidatePath(`/messages/${message.chat_id}`);
  revalidatePath("/messages");
  revalidatePath(`/admin/conversations/${message.chat_id}`);
  return { success: true };
}

export async function deleteMessages(messageIds: string[]) {
  const results = await Promise.all(
    messageIds.map((id) => deleteMessage(id))
  );
  const firstError = results.find((r) => "error" in r && r.error);
  if (firstError && "error" in firstError) return { error: firstError.error };
  return { success: true };
}

export async function toggleMessagePin(messageId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: message } = await supabase
    .from("messages")
    .select("id, chat_id, is_pinned")
    .eq("id", messageId)
    .maybeSingle();

  if (!message) return { error: "Message introuvable" };

  const nextPinned = !message.is_pinned;

  const { error } = await supabase
    .from("messages")
    .update({
      is_pinned: nextPinned,
      pinned_at: nextPinned ? new Date().toISOString() : null,
      pinned_by: nextPinned ? user.id : null,
    })
    .eq("id", messageId);

  if (error) return { error: error.message };

  revalidatePath(`/messages/${message.chat_id}`);
  revalidatePath(`/admin/conversations/${message.chat_id}`);
  return { success: true, isPinned: nextPinned };
}

/** Marque comme lus les messages reçus (action client — avec revalidation). */
export async function markChatMessagesAsRead(chatId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const result = await markChatMessagesAsReadInDb(chatId, user.id);
  if (result.error) return { error: result.error };

  revalidatePath("/messages");
  revalidatePath(`/messages/${chatId}`);
  revalidatePath("/admin/conversations");
  revalidatePath(`/admin/conversations/${chatId}`);
  revalidatePath("/admin/notifications");
  return { success: true };
}
