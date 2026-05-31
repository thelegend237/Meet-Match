import { notFound } from "next/navigation";
import { AdminBackLink } from "@/components/admin/admin-page";
import { AdminChatControls } from "@/components/admin/admin-chat-controls";
import { ChatThread } from "@/components/user/chat-thread";
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

  const { chat, messages, senderById, partnerName, canSend } = supabaseChat;
  const senderMap = Object.fromEntries(senderById);

  const backHref =
    chat.type === "match_group"
      ? "/admin/conversations/matchs"
      : "/admin/conversations";

  const title =
    chat.type === "match_group" && partnerName
      ? partnerName
      : chat.type === "match_group"
        ? "Discussion match"
        : "Contact visiteur";

  const subtitle =
    chat.type === "admin_contact"
      ? "Message du formulaire contact"
      : "Match accompagné";

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <AdminBackLink href={backHref} label="Retour aux conversations" />
        <AdminChatControls chatId={chatId} status={chat.status} />
      </div>

      <ChatThread
        chatId={chatId}
        initialMessages={messages}
        senderById={senderMap}
        currentUserId={admin.id}
        canSend={canSend}
        className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/60 shadow-sm"
        header={{
          title,
          subtitle,
          backHref,
          isOpen: chat.status === "open",
          isAdmin: true,
        }}
      />
    </div>
  );
}
