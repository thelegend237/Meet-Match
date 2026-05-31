"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
  revalidatePath("/admin/conversations/matchs");
  return { success: true };
}
