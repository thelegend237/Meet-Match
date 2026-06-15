import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { markChatMessagesAsRead } from "@/lib/chat/mark-read";
import { TEAM_AVATAR_URL, TEAM_DISPLAY_NAME } from "@/lib/chat/team";
import { getChatThread } from "@/lib/user/chats";
import { ChatThread } from "@/components/user/chat-thread";

interface PageProps {
  params: Promise<{ chatId: string }>;
}

export default async function MessageThreadPage({ params }: PageProps) {
  const { chatId } = await params;
  const profile = await requireUser();
  const thread = await getChatThread(chatId, profile.id);

  if (!thread) notFound();

  await markChatMessagesAsRead(chatId, profile.id);

  const isMatchGroup = thread.chat.type === "match_group";
  const participants = [...thread.participants].sort((a, b) => {
    if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
    if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const isAdminContact = thread.chat.type === "admin_contact";
  const title =
    isMatchGroup && thread.partnerName
      ? thread.partnerName
      : isAdminContact
        ? TEAM_DISPLAY_NAME
        : "Discussion";

  return (
    <ChatThread
      chatId={chatId}
      initialMessages={thread.messages}
      senderById={thread.senderById}
      currentUserId={profile.id}
      canSend={thread.canSend}
      className="h-full min-h-0 flex-1"
      header={{
        title,
        subtitle: isMatchGroup
          ? undefined
          : "Contact accompagné par l'équipe",
        avatarUrl: isAdminContact ? TEAM_AVATAR_URL : thread.partnerPhoto,
        backHref: "/messages",
        isOpen: thread.chat.status === "open",
        isMatchGroup,
        matchId: thread.matchId,
        participants,
      }}
    />
  );
}
