import { createClient } from "@/lib/supabase/server";

/** Marque comme lus les messages reçus dans une discussion (sans revalidation de cache). */
export async function markChatMessagesAsRead(
  chatId: string,
  userId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("chat_id", chatId)
    .neq("sender_id", userId)
    .is("read_at", null);

  if (error) return { error: error.message };
  return {};
}
