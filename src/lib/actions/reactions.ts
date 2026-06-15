"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleMessageReaction(messageId: string, emoji: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Non authentifié" };

  const trimmed = emoji.trim();
  if (!trimmed) return { error: "Réaction invalide" };

  const { data: message } = await supabase
    .from("messages")
    .select("id, chat_id")
    .eq("id", messageId)
    .single();

  if (!message) return { error: "Message introuvable" };

  const { data: existing } = await supabase
    .from("message_reactions")
    .select("id, emoji")
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.emoji === trimmed) {
    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else if (existing) {
    const { error } = await supabase
      .from("message_reactions")
      .update({ emoji: trimmed })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("message_reactions").insert({
      message_id: messageId,
      user_id: user.id,
      emoji: trimmed,
    });

    if (error) return { error: error.message };
  }

  revalidatePath(`/messages/${message.chat_id}`);
  revalidatePath(`/admin/conversations/${message.chat_id}`);
  return { success: true };
}
