import { requireActiveMember } from "@/lib/auth/session";
import { getUserChats } from "@/lib/user/chats";
import { MessagesShell } from "@/components/user/messages-shell";

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireActiveMember();
  const chats = await getUserChats(profile.id);

  return <MessagesShell chats={chats}>{children}</MessagesShell>;
}
