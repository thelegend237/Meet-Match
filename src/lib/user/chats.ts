import { TEAM_AVATAR_URL, TEAM_DISPLAY_NAME } from "@/lib/chat/team";
import { createClient } from "@/lib/supabase/server";
import type {
  ChatSummary,
  ChatMessage,
  MessageReaction,
} from "@/lib/types/database";

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

  const [{ data: matches }, { data: allMessages }, { data: unreadRows }] =
    await Promise.all([
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
      supabase
        .from("messages")
        .select("chat_id")
        .in("chat_id", chatIds)
        .neq("sender_id", userId)
        .is("read_at", null),
    ]);

  const unreadByChat = new Map<string, number>();
  for (const row of unreadRows ?? []) {
    unreadByChat.set(row.chat_id, (unreadByChat.get(row.chat_id) ?? 0) + 1);
  }

  const lastMessageByChat = new Map<string, { content: string; created_at: string }>();
  for (const msg of allMessages ?? []) {
    if (!lastMessageByChat.has(msg.chat_id)) {
      lastMessageByChat.set(msg.chat_id, {
        content: msg.content,
        created_at: msg.created_at,
      });
    }
  }

  const matchUserIds = new Set<string>();
  for (const m of matches ?? []) {
    matchUserIds.add(m.user_a_id);
    matchUserIds.add(m.user_b_id);
  }

  const { data: partners } = matchUserIds.size
    ? await supabase
        .from("profiles")
        .select("id, display_name, primary_photo_url, last_seen_at")
        .in("id", [...matchUserIds])
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
      const userA = partnerById.get(match.user_a_id);
      const userB = partnerById.get(match.user_b_id);
      title = `${userA?.display_name ?? "?"} & ${userB?.display_name ?? "?"}`;
      photo = partner?.primary_photo_url ?? null;
      const avatar_urls = [
        userA?.primary_photo_url ?? null,
        userB?.primary_photo_url ?? null,
      ];

      return {
        id: chat.id,
        type: chat.type,
        status: chat.status,
        match_id: chat.match_id,
        match_status: match?.status ?? null,
        title,
        photo,
        avatar_urls,
        last_message: lastMessageByChat.get(chat.id) ?? null,
        unread_count: unreadByChat.get(chat.id) ?? 0,
        participant_last_seen_at: [partner?.last_seen_at ?? null],
      };
    } else if (chat.type === "admin_contact") {
      title = TEAM_DISPLAY_NAME;
      photo = TEAM_AVATAR_URL;
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
      unread_count: unreadByChat.get(chat.id) ?? 0,
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

  const { data: viewerParticipation } = await supabase
    .from("chat_participants")
    .select("user_id")
    .eq("chat_id", chatId)
    .eq("user_id", userId)
    .maybeSingle();

  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  const isStaff =
    viewerProfile?.role === "admin" ||
    viewerProfile?.role === "superadmin";

  if (!viewerParticipation && !isStaff) return null;

  const [{ data: messages }, { data: participantRows }] = await Promise.all([
    supabase
      .from("messages")
      .select("id, chat_id, sender_id, content, created_at, read_at")
      .eq("chat_id", chatId)
      .order("created_at", { ascending: true }),
    supabase
      .from("chat_participants")
      .select("user_id, role")
      .eq("chat_id", chatId),
  ]);

  const roleByUserId = new Map(
    (participantRows ?? []).map((p) => [p.user_id, p.role])
  );

  const participantIds = [
    ...new Set((participantRows ?? []).map((p) => p.user_id).filter(Boolean)),
  ] as string[];

  const { data: profiles } = participantIds.length
    ? await supabase
        .from("profiles")
        .select("id, display_name, email, role, primary_photo_url")
        .in("id", participantIds)
    : { data: [] };

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

  const senderById = new Map<
    string,
    { name: string; isAdmin: boolean; photo: string | null }
  >();

  for (const p of profiles ?? []) {
    const isAdminRole = p.role !== "user";
    senderById.set(p.id, {
      name: isAdminRole ? TEAM_DISPLAY_NAME : p.display_name || p.email,
      isAdmin: isAdminRole,
      photo: isAdminRole
        ? TEAM_AVATAR_URL
        : p.primary_photo_url ?? null,
    });
  }

  for (const participantId of participantIds) {
    if (senderById.has(participantId)) continue;
    if (roleByUserId.get(participantId) === "admin") {
      senderById.set(participantId, {
        name: TEAM_DISPLAY_NAME,
        isAdmin: true,
        photo: TEAM_AVATAR_URL,
      });
    }
  }

  for (const msg of messages ?? []) {
    if (msg.sender_id && !senderById.has(msg.sender_id)) {
      senderById.set(msg.sender_id, {
        name: TEAM_DISPLAY_NAME,
        isAdmin: true,
        photo: TEAM_AVATAR_URL,
      });
    }
  }

  const participantsList = participantIds.map((participantId) => {
    const profile = profiles?.find((p) => p.id === participantId);
    if (profile) {
      const isAdminRole = profile.role !== "user";
      return {
        id: profile.id,
        name: isAdminRole ? TEAM_DISPLAY_NAME : profile.display_name || profile.email,
        photo: isAdminRole ? TEAM_AVATAR_URL : profile.primary_photo_url ?? null,
        isAdmin: isAdminRole,
        isSelf: profile.id === userId,
      };
    }
    if (roleByUserId.get(participantId) === "admin") {
      return {
        id: participantId,
        name: TEAM_DISPLAY_NAME,
        photo: TEAM_AVATAR_URL,
        isAdmin: true,
        isSelf: false,
      };
    }
    return {
      id: participantId,
      name: "Membre",
      photo: null,
      isAdmin: false,
      isSelf: participantId === userId,
    };
  });

  const canSend =
    chat.status === "open" &&
    (chat.type === "admin_contact" ||
      isStaff ||
      (chat.type === "match_group" && matchStatus === "active"));

  const messageIds = (messages ?? []).map((m) => m.id);
  const { data: reactionRows } = messageIds.length
    ? await supabase
        .from("message_reactions")
        .select("id, message_id, user_id, emoji, created_at")
        .in("message_id", messageIds)
    : { data: [] };

  const reactionsByMessage = new Map<string, MessageReaction[]>();
  for (const reaction of reactionRows ?? []) {
    const list = reactionsByMessage.get(reaction.message_id) ?? [];
    list.push(reaction as MessageReaction);
    reactionsByMessage.set(reaction.message_id, list);
  }

  const messagesWithReactions = (messages ?? []).map((message) => ({
    ...message,
    reactions: reactionsByMessage.get(message.id) ?? [],
  })) as ChatMessage[];

  return {
    chat,
    messages: messagesWithReactions,
    senderById: Object.fromEntries(senderById),
    participants: participantsList,
    partnerName,
    partnerPhoto,
    matchStatus,
    matchId: chat.match_id,
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
