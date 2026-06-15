"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { markChatMessagesAsRead as markChatMessagesAsReadInDb } from "@/lib/chat/mark-read";

export async function sendMessage(chatId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const trimmed = content.trim();
  if (!trimmed) return { error: "Message vide" };

  const { error } = await supabase.from("messages").insert({
    chat_id: chatId,
    sender_id: user.id,
    content: trimmed,
  });

  if (error) return { error: error.message };

  revalidatePath(`/messages/${chatId}`);
  revalidatePath("/messages");
  revalidatePath(`/admin/conversations/${chatId}`);
  revalidatePath("/admin/conversations");
  return { success: true };
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
