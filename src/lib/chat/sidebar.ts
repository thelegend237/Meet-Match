import type { ChatSummary } from "@/lib/types/database";

/** Conversation visible dans la barre latérale : au moins un message échangé. */
export function isChatVisibleInSidebar(chat: ChatSummary): boolean {
  return Boolean(chat.last_message);
}

export function filterSidebarChats(chats: ChatSummary[]): ChatSummary[] {
  return chats.filter(isChatVisibleInSidebar);
}
