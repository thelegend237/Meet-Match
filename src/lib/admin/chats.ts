import { createClient } from "@/lib/supabase/server";
import { filterSidebarChats } from "@/lib/chat/sidebar";
import { getAdminContactConversations } from "@/lib/admin/conversations";
import type { ChatSummary } from "@/lib/types/database";

export async function getAdminConversationChats(
  adminId: string
): Promise<ChatSummary[]> {
  const supabase = await createClient();

  const [contactRows, { data: matchChats }] = await Promise.all([
    getAdminContactConversations(),
    supabase
      .from("chats")
      .select("id, type, status, match_id, created_at")
      .eq("type", "match_group")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const contactChatIds = contactRows.map((row) => row.id);
  const { data: contactParticipants } = contactChatIds.length
    ? await supabase
        .from("chat_participants")
        .select("chat_id, user_id")
        .in("chat_id", contactChatIds)
        .eq("role", "user")
    : { data: [] };

  const contactUserIds = [
    ...new Set((contactParticipants ?? []).map((p) => p.user_id)),
  ];
  const { data: contactProfiles } = contactUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, last_seen_at, primary_photo_url")
        .in("id", contactUserIds)
    : { data: [] };

  const contactProfileById = new Map(
    (contactProfiles ?? []).map((p) => [p.id, p])
  );
  const lastSeenByContactChat = new Map<string, (string | null)[]>();
  const photoByContactChat = new Map<string, string | null>();
  for (const participant of contactParticipants ?? []) {
    const profile = contactProfileById.get(participant.user_id);
    lastSeenByContactChat.set(participant.chat_id, [
      profile?.last_seen_at ?? null,
    ]);
    photoByContactChat.set(
      participant.chat_id,
      profile?.primary_photo_url ?? null
    );
  }

  const allChats: {
    id: string;
    type: "admin_contact" | "match_group";
    status: string;
    match_id: string | null;
    created_at: string;
    title: string;
    photo?: string | null;
    avatar_urls?: (string | null)[];
    participant_last_seen_at?: (string | null)[];
  }[] = [];

  for (const row of contactRows) {
    const title =
      row.member_name ?? row.contact_name ?? row.subject ?? "Contact";
    allChats.push({
      id: row.id,
      type: "admin_contact",
      status: row.status,
      match_id: null,
      created_at: row.created_at,
      title,
      photo: photoByContactChat.get(row.id) ?? null,
      participant_last_seen_at: lastSeenByContactChat.get(row.id),
    });
  }

  const matchIds = (matchChats ?? [])
    .map((c) => c.match_id)
    .filter(Boolean) as string[];

  const { data: matches } = matchIds.length
    ? await supabase
        .from("matches")
        .select("id, user_a_id, user_b_id, status")
        .in("id", matchIds)
    : { data: [] };

  const userIds = new Set<string>();
  for (const m of matches ?? []) {
    userIds.add(m.user_a_id);
    userIds.add(m.user_b_id);
  }

  const { data: profiles } = userIds.size
    ? await supabase
        .from("profiles")
        .select("id, display_name, email, primary_photo_url, last_seen_at")
        .in("id", [...userIds])
    : { data: [] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const matchById = new Map((matches ?? []).map((m) => [m.id, m]));

  for (const chat of matchChats ?? []) {
    const match = chat.match_id ? matchById.get(chat.match_id) : null;
    const userA = match ? profileById.get(match.user_a_id) : null;
    const userB = match ? profileById.get(match.user_b_id) : null;
    allChats.push({
      id: chat.id,
      type: "match_group",
      status: chat.status,
      match_id: chat.match_id,
      created_at: chat.created_at,
      title: match
        ? `${userA?.display_name ?? userA?.email ?? "?"} & ${userB?.display_name ?? userB?.email ?? "?"}`
        : "Discussion match",
      avatar_urls: match
        ? [userA?.primary_photo_url ?? null, userB?.primary_photo_url ?? null]
        : undefined,
      participant_last_seen_at: match
        ? [userA?.last_seen_at ?? null, userB?.last_seen_at ?? null]
        : undefined,
    });
  }

  const chatIds = allChats.map((c) => c.id);
  if (!chatIds.length) return [];

  const [{ data: allMessages }, { data: unreadRows }] = await Promise.all([
    supabase
      .from("messages")
      .select("chat_id, content, created_at")
      .in("chat_id", chatIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("messages")
      .select("chat_id")
      .in("chat_id", chatIds)
      .neq("sender_id", adminId)
      .is("read_at", null),
  ]);

  const lastMessageByChat = new Map<
    string,
    { content: string; created_at: string }
  >();
  for (const msg of allMessages ?? []) {
    if (!lastMessageByChat.has(msg.chat_id)) {
      lastMessageByChat.set(msg.chat_id, {
        content: msg.content,
        created_at: msg.created_at,
      });
    }
  }

  const unreadByChat = new Map<string, number>();
  for (const row of unreadRows ?? []) {
    unreadByChat.set(row.chat_id, (unreadByChat.get(row.chat_id) ?? 0) + 1);
  }

  return filterSidebarChats(
    allChats
    .map((chat) => {
      const match = chat.match_id ? matchById.get(chat.match_id) : null;
      return {
        id: chat.id,
        type: chat.type,
        status: chat.status as ChatSummary["status"],
        match_id: chat.match_id,
        match_status: match?.status ?? null,
        title: chat.title,
        photo: chat.photo ?? chat.avatar_urls?.[0] ?? null,
        avatar_urls: chat.avatar_urls,
        last_message: lastMessageByChat.get(chat.id) ?? null,
        unread_count: unreadByChat.get(chat.id) ?? 0,
        participant_last_seen_at: chat.participant_last_seen_at,
      };
    })
    .sort((a, b) => {
      const aTime = a.last_message?.created_at ?? "";
      const bTime = b.last_message?.created_at ?? "";
      if (aTime && bTime) return bTime.localeCompare(aTime);
      if (aTime) return -1;
      if (bTime) return 1;
      return 0;
    })
  );
}

export async function getOrCreateAdminUserChat(
  adminId: string,
  userId: string
): Promise<string | null> {
  const supabase = await createClient();

  const { data: userParticipations } = await supabase
    .from("chat_participants")
    .select("chat_id")
    .eq("user_id", userId)
    .eq("role", "user");

  const participantChatIds = (userParticipations ?? []).map((p) => p.chat_id);

  if (participantChatIds.length) {
    const { data: existingChats } = await supabase
      .from("chats")
      .select("id, status")
      .in("id", participantChatIds)
      .eq("type", "admin_contact")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    const existing =
      existingChats?.find((c) => c.status === "open") ?? existingChats?.[0];

    if (existing) {
      const { data: adminParticipation } = await supabase
        .from("chat_participants")
        .select("user_id")
        .eq("chat_id", existing.id)
        .eq("user_id", adminId)
        .maybeSingle();

      if (!adminParticipation) {
        await supabase.from("chat_participants").insert({
          chat_id: existing.id,
          user_id: adminId,
          role: "admin",
        });
      }

      return existing.id;
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", userId)
    .single();

  if (!profile) return null;

  const { data: chat, error } = await supabase
    .from("chats")
    .insert({
      type: "admin_contact",
      status: "open",
      contact_name: profile.display_name || profile.email,
      created_by: adminId,
    })
    .select("id")
    .single();

  if (error || !chat) return null;

  await supabase.from("chat_participants").insert([
    { chat_id: chat.id, user_id: userId, role: "user" },
    { chat_id: chat.id, user_id: adminId, role: "admin" },
  ]);

  return chat.id;
}
