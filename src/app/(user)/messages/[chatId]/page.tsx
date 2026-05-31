import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
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

  const title =
    thread.chat.type === "match_group" && thread.partnerName
      ? thread.partnerName
      : "Discussion";

  const senderById = Object.fromEntries(thread.senderById);

  return (
    <div className="-mx-4 flex h-[calc(100dvh-3.5rem)] flex-col sm:mx-0 md:h-[calc(100dvh-5rem)]">
      <ChatThread
        chatId={chatId}
        initialMessages={thread.messages}
        senderById={senderById}
        currentUserId={profile.id}
        canSend={thread.canSend}
        className="h-full rounded-none border-0 shadow-none sm:rounded-2xl sm:border sm:shadow-sm"
        header={{
          title,
          subtitle:
            thread.chat.type === "match_group"
              ? "Discussion accompagnée · Admin présent"
              : "Contact Meet & Match",
          avatarUrl: thread.partnerPhoto,
          backHref: "/messages",
          isOpen: thread.chat.status === "open",
        }}
      />
    </div>
  );
}
