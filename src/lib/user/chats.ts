import { createClient } from "@/lib/supabase/server";
import type { ChatSummary, ChatMessage } from "@/lib/types/database";

export async function getUserChats(userId: string): Promise<ChatSummary[]> {
  const supabase = await createClient();

  const { data: participations } = await supabase
    .from("chat_participants")
    .select("chat_id")
    .eq("user_id", userId);

  const chatIds = (participations ?? []).map((p) => p.chat_id);
  if (!chatIds.length) return [];

  const { data: chats } = await supabase
    .from("chats")
    .select("id, type, status, match_id, created_at")
    .in("id", chatIds)
    .order("created_at", { ascending: false });

  if (!chats?.length) return [];

  const matchIds = chats
    .map((c) => c.match_id)
    .filter(Boolean) as string[];

  const [{ data: matches }, { data: allMessages }] = await Promise.all([
    matchIds.length
      ? supabase
          .from("matches")
          .select("id, user_a_id, user_b_id, chat_id, status")
          .in("id", matchIds)
      : Promise.resolve({ data: [] }),
    supabase
      .from("messages")
      .select("chat_id, content, created_at")
      .in("chat_id", chatIds)
      .order("created_at", { ascending: false }),
  ]);

  const lastMessageByChat = new Map<string, { content: string; created_at: string }>();
  for (const msg of allMessages ?? []) {
    if (!lastMessageByChat.has(msg.chat_id)) {
      lastMessageByChat.set(msg.chat_id, {
        content: msg.content,
        created_at: msg.created_at,
      });
    }
  }

  const partnerIds = new Set<string>();
  for (const m of matches ?? []) {
    const partnerId = m.user_a_id === userId ? m.user_b_id : m.user_a_id;
    partnerIds.add(partnerId);
  }

  const { data: partners } = partnerIds.size
    ? await supabase
        .from("profiles")
        .select("id, display_name, primary_photo_url")
        .in("id", [...partnerIds])
    : { data: [] };

  const partnerById = new Map(
    (partners ?? []).map((p) => [p.id, p])
  );
  const matchByChatId = new Map(
    (matches ?? []).filter((m) => m.chat_id).map((m) => [m.chat_id!, m])
  );

  return chats
    .map((chat) => {
    const match = chat.match_id ? matchByChatId.get(chat.id) : null;
    let title = "Discussion";
    let photo: string | null = null;

    if (chat.type === "match_group" && match) {
      const partnerId =
        match.user_a_id === userId ? match.user_b_id : match.user_a_id;
      const partner = partnerById.get(partnerId);
      title = partner?.display_name ?? "Match";
      photo = partner?.primary_photo_url ?? null;
    } else if (chat.type === "admin_contact") {
      title = "Contact Meet & Match";
    }

    return {
      id: chat.id,
      type: chat.type,
      status: chat.status,
      match_id: chat.match_id,
      match_status: match?.status ?? null,
      title,
      photo,
      last_message: lastMessageByChat.get(chat.id) ?? null,
    };
  })
    .sort((a, b) => {
      const aTime = a.last_message?.created_at ?? "";
      const bTime = b.last_message?.created_at ?? "";
      if (aTime && bTime) return bTime.localeCompare(aTime);
      if (aTime) return -1;
      if (bTime) return 1;
      return 0;
    });
}

export async function getChatThread(chatId: string, userId: string) {
  const supabase = await createClient();

  const { data: chat } = await supabase
    .from("chats")
    .select("id, type, status, match_id")
    .eq("id", chatId)
    .single();

  if (!chat) return null;

  const [{ data: messages }, { data: participants }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, chat_id, sender_id, content, created_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true }),
    supabase
      .from("chat_participants")
      .select("user_id, role")
      .eq("chat_id", chatId),
  ]);

  const participantIds = [
    ...new Set((participants ?? []).map((p) => p.user_id).filter(Boolean)),
  ] as string[];

  const { data: profiles } = participantIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, email, role, primary_photo_url")
        .in("id", participantIds)
    : { data: [] };

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  const isStaff =
    viewerProfile?.role === "admin" ||
    viewerProfile?.role === "superadmin";

  let matchStatus: string | null = null;
  let partnerName: string | null = null;
  let partnerPhoto: string | null = null;

  if (chat.match_id) {
    const { data: match } = await supabase
      .from("matches")
      .select("status, user_a_id, user_b_id")
      .eq("id", chat.match_id)
      .single();
    matchStatus = match?.status ?? null;
    if (match) {
      const partnerId =
        match.user_a_id === userId ? match.user_b_id : match.user_a_id;
      const partner = profiles?.find((p) => p.id === partnerId);
      partnerName = partner?.display_name ?? null;
      partnerPhoto = partner?.primary_photo_url ?? null;
    }
  }

  const senderById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      {
        name: p.display_name || p.email,
        isAdmin: p.role !== "user",
      },
    ])
  );

  const canSend =
    chat.status === "open" &&
    (chat.type === "admin_contact" ||
      isStaff ||
      (chat.type === "match_group" && matchStatus === "active"));

  return {
    chat,
    messages: (messages ?? []) as ChatMessage[],
    senderById,
    partnerName,
    partnerPhoto,
    matchStatus,
    canSend,
    currentUserId: userId,
  };
}

export async function getAdminMatchChats(): Promise<ChatSummary[]> {
  const supabase = await createClient();

  const { data: chats } = await supabase
    .from("chats")
    .select("id, type, status, match_id, created_at")
    .eq("type", "match_group")
    .order("created_at", { ascending: false });

  if (!chats?.length) return [];

  const chatIds = chats.map((c) => c.id);
  const matchIds = chats.map((c) => c.match_id).filter(Boolean) as string[];

  const [{ data: matches }, { data: allMessages }] = await Promise.all([
    supabase
      .from("matches")
      .select("id, user_a_id, user_b_id, chat_id, status")
      .in("id", matchIds),
    supabase
      .from("messages")
      .select("chat_id, content, created_at")
      .in("chat_id", chatIds)
      .order("created_at", { ascending: false }),
  ]);

  const lastMessageByChat = new Map<string, { content: string; created_at: string }>();
  for (const msg of allMessages ?? []) {
    if (!lastMessageByChat.has(msg.chat_id)) {
      lastMessageByChat.set(msg.chat_id, {
        content: msg.content,
        created_at: msg.created_at,
      });
    }
  }

  const userIds = new Set<string>();
  for (const m of matches ?? []) {
    userIds.add(m.user_a_id);
    userIds.add(m.user_b_id);
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", [...userIds]);

  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name])
  );
  const matchById = new Map((matches ?? []).map((m) => [m.id, m]));

  return chats
    .map((chat) => {
    const match = chat.match_id ? matchById.get(chat.match_id) : null;
    const title = match
      ? `${nameById.get(match.user_a_id) ?? "?"} & ${nameById.get(match.user_b_id) ?? "?"}`
      : "Match";

    return {
      id: chat.id,
      type: chat.type,
      status: chat.status,
      match_id: chat.match_id,
      match_status: match?.status ?? null,
      title,
      photo: null,
      last_message: lastMessageByChat.get(chat.id) ?? null,
    };
  })
    .sort((a, b) => {
      const aTime = a.last_message?.created_at ?? "";
      const bTime = b.last_message?.created_at ?? "";
      if (aTime && bTime) return bTime.localeCompare(aTime);
      if (aTime) return -1;
      if (bTime) return 1;
      return 0;
    });
}
