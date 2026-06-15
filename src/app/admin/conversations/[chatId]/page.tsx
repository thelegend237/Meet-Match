import { notFound } from "next/navigation";
import { AdminChatControls } from "@/components/admin/admin-chat-controls";
import { ChatThread } from "@/components/user/chat-thread";
import { markChatMessagesAsRead } from "@/lib/chat/mark-read";
import { requireAdmin } from "@/lib/auth/session";
import { getChatThread } from "@/lib/user/chats";

interface PageProps {
  params: Promise<{ chatId: string }>;
}

export default async function AdminConversationPage({ params }: PageProps) {
  const { chatId } = await params;
  const admin = await requireAdmin();
  const supabaseChat = await getChatThread(chatId, admin.id);

  if (!supabaseChat) notFound();

  await markChatMessagesAsRead(chatId, admin.id);

  const { chat, messages, senderById, partnerName, canSend, matchId } =
    supabaseChat;

  const participants = [...supabaseChat.participants].sort((a, b) => {
    if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const memberParticipant = participants.find((p) => !p.isAdmin);
  const memberName = memberParticipant?.name ?? null;
  const memberPhoto = memberParticipant?.photo ?? null;

  const title =
    chat.type === "match_group" && partnerName
      ? partnerName
      : chat.type === "match_group"
        ? "Discussion match"
        : memberName ?? "Contact visiteur";

  const subtitle =
    chat.type === "admin_contact"
      ? memberName
        ? "Échange avec un membre inscrit"
        : "Message du formulaire contact"
      : "Match accompagné";

  return (
    <ChatThread
      chatId={chatId}
      initialMessages={messages}
      senderById={senderById}
      currentUserId={admin.id}
      canSend={canSend}
      className="h-full min-h-0"
      header={{
        title,
        subtitle,
        avatarUrl:
          chat.type === "admin_contact"
            ? memberPhoto
            : memberPhoto ?? supabaseChat.partnerPhoto,
        backHref: "/admin/conversations",
        isOpen: chat.status === "open",
        isStaffView: true,
        isMatchGroup: chat.type === "match_group",
        matchId,
        participants,
        headerActions: (
          <AdminChatControls chatId={chatId} status={chat.status} />
        ),
      }}
    />
  );
}
