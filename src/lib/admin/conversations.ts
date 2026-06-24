import { createClient } from "@/lib/supabase/server";

export type AdminContactChatRow = {
  id: string;
  subject: string | null;
  contact_name: string | null;
  contact_email: string | null;
  status: string;
  created_at: string;
  member_name: string | null;
};

export async function getAdminContactConversations(): Promise<
  AdminContactChatRow[]
> {
  const supabase = await createClient();

  const { data: chats } = await supabase
    .from("chats")
    .select("id, subject, contact_name, contact_email, status, created_at")
    .eq("type", "admin_contact")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (!chats?.length) return [];

  const chatIds = chats.map((c) => c.id);

  const { data: participants } = await supabase
    .from("chat_participants")
    .select("chat_id, user_id, role")
    .in("chat_id", chatIds)
    .eq("role", "user");

  const userIds = [
    ...new Set((participants ?? []).map((p) => p.user_id).filter(Boolean)),
  ] as string[];

  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds)
    : { data: [] };

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name || p.email])
  );

  const memberByChat = new Map<string, string>();
  for (const p of participants ?? []) {
    const name = profileById.get(p.user_id);
    if (name) memberByChat.set(p.chat_id, name);
  }

  return chats.map((chat) => ({
    ...chat,
    member_name: memberByChat.get(chat.id) ?? null,
  }));
}
