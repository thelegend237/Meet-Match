import { createClient } from "@/lib/supabase/server";

export type AdminNotificationCategory =
  | "contact"
  | "match_chat"
  | "matching"
  | "match_pending"
  | "registration"
  | "new_member";

export type AdminNotificationPriority = "high" | "medium" | "low";

export interface AdminNotification {
  id: string;
  category: AdminNotificationCategory;
  priority: AdminNotificationPriority;
  title: string;
  description: string;
  href: string;
  createdAt: string;
  actionLabel: string;
}

export interface AdminNotificationSummary {
  total: number;
  actionable: number;
  discussions: number;
  matching: number;
  members: number;
}

function sortNotifications(items: AdminNotification[]) {
  const priorityOrder: Record<AdminNotificationPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return [...items].sort((a, b) => {
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export async function getAdminLiveQueue(): Promise<{
  notifications: AdminNotification[];
  summary: AdminNotificationSummary;
}> {
  const supabase = await createClient();

  const [
    { data: contactChats },
    { data: matchChats },
    { data: recentMessages },
  ] = await Promise.all([
    supabase
      .from("chats")
      .select("id, subject, contact_name, contact_email, status, created_at")
      .eq("type", "admin_contact")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("chats")
      .select("id, status, match_id, created_at")
      .eq("type", "match_group")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("messages")
      .select("chat_id, content, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const notifications: AdminNotification[] = [];
  const contactChatIds = (contactChats ?? []).map((c) => c.id);
  const matchChatIds = (matchChats ?? []).map((c) => c.id);
  const allChatIds = [...contactChatIds, ...matchChatIds];

  const lastMessageByChat = new Map<string, { content: string; created_at: string }>();
  for (const msg of recentMessages ?? []) {
    if (allChatIds.includes(msg.chat_id) && !lastMessageByChat.has(msg.chat_id)) {
      lastMessageByChat.set(msg.chat_id, {
        content: msg.content,
        created_at: msg.created_at,
      });
    }
  }

  if (contactChatIds.length) {
    const { data: participants } = await supabase
      .from("chat_participants")
      .select("chat_id, user_id")
      .in("chat_id", contactChatIds)
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

    const nameById = new Map(
      (profiles ?? []).map((p) => [p.id, p.display_name || p.email])
    );
    const memberByChat = new Map<string, string>();
    for (const p of participants ?? []) {
      const name = nameById.get(p.user_id);
      if (name) memberByChat.set(p.chat_id, name);
    }

    for (const chat of contactChats ?? []) {
      const title =
        memberByChat.get(chat.id) ??
        chat.contact_name ??
        chat.subject ??
        "Nouveau message contact";
      const lastMessage = lastMessageByChat.get(chat.id);
      const preview = lastMessage?.content
        ? lastMessage.content.slice(0, 120)
        : chat.contact_email
          ? `Message de ${chat.contact_email}`
          : "Conversation en attente de réponse.";

      notifications.push({
        id: `contact-${chat.id}`,
        category: "contact",
        priority: "high",
        title,
        description: preview,
        href: `/admin/conversations/${chat.id}`,
        createdAt: lastMessage?.created_at ?? chat.created_at,
        actionLabel: "Répondre",
      });
    }
  }

  if (matchChatIds.length) {
    const matchIds = (matchChats ?? [])
      .map((c) => c.match_id)
      .filter(Boolean) as string[];

    const { data: matches } = matchIds.length
      ? await supabase
          .from("matches")
          .select("id, user_a_id, user_b_id, chat_id")
          .in("id", matchIds)
      : { data: [] };

    const userIds = [
      ...new Set((matches ?? []).flatMap((m) => [m.user_a_id, m.user_b_id])),
    ];

    const { data: profiles } = userIds.length
      ? await supabase
          .from("profiles")
          .select("id, display_name, email")
          .in("id", userIds)
      : { data: [] };

    const nameById = new Map(
      (profiles ?? []).map((p) => [p.id, p.display_name || p.email])
    );
    const matchByChatId = new Map(
      (matches ?? []).filter((m) => m.chat_id).map((m) => [m.chat_id!, m])
    );

    for (const chat of matchChats ?? []) {
      const match = matchByChatId.get(chat.id);
      const title = match
        ? `${nameById.get(match.user_a_id) ?? "Membre"} & ${nameById.get(match.user_b_id) ?? "Membre"}`
        : "Discussion match";
      const lastMessage = lastMessageByChat.get(chat.id);

      notifications.push({
        id: `match-chat-${chat.id}`,
        category: "match_chat",
        priority: "high",
        title,
        description: lastMessage?.content
          ? lastMessage.content.slice(0, 120)
          : "Discussion de match ouverte — un échange attend votre attention.",
        href: `/admin/conversations/${chat.id}`,
        createdAt: lastMessage?.created_at ?? chat.created_at,
        actionLabel: "Ouvrir la discussion",
      });
    }
  }

  const sorted = sortNotifications(notifications);
  const actionable = sorted.length;

  return {
    notifications: sorted,
    summary: {
      total: sorted.length,
      actionable,
      discussions: sorted.length,
      matching: 0,
      members: 0,
    },
  };
}

/** Badge admin = non lues en base + discussions actives non couvertes. */
export async function getAdminBadgeCount(adminId: string): Promise<number> {
  const supabase = await createClient();

  const [{ count: dbUnread }, live, { data: unreadChatNotifs }] =
    await Promise.all([
      supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", adminId)
        .eq("is_read", false),
      getAdminLiveQueue(),
      supabase
        .from("notifications")
        .select("metadata")
        .eq("user_id", adminId)
        .eq("is_read", false)
        .eq("type", "chat_opened"),
    ]);

  const coveredChats = new Set(
    (unreadChatNotifs ?? [])
      .map((n) => n.metadata?.chat_id)
      .filter((id): id is string => typeof id === "string")
  );

  const extraLive = live.notifications.filter((item) => {
    if (item.category === "contact") {
      const chatId = item.id.replace("contact-", "");
      return !coveredChats.has(chatId);
    }
    return true;
  }).length;

  return (dbUnread ?? 0) + extraLive;
}

/** @deprecated Utiliser getAdminLiveQueue + fetchUserNotifications */
export async function getAdminNotifications(): Promise<{
  notifications: AdminNotification[];
  summary: AdminNotificationSummary;
}> {
  return getAdminLiveQueue();
}

export async function getAdminNotificationCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  return getAdminBadgeCount(user.id);
}
