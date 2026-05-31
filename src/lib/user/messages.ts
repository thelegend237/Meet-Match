import { createClient } from "@/lib/supabase/server";

/** Messages non lus dans les discussions de l'utilisateur. */
export async function getUnreadMessageCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { data: participations } = await supabase
    .from("chat_participants")
    .select("chat_id")
    .eq("user_id", userId);

  const chatIds = (participations ?? []).map((p) => p.chat_id);
  if (chatIds.length === 0) return 0;

  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .in("chat_id", chatIds)
    .neq("sender_id", userId)
    .is("read_at", null);

  if (error) {
    console.error("[messages] unread count:", error.message);
    return 0;
  }

  return count ?? 0;
}
