import { AdminConversationsShell } from "@/components/admin/admin-conversations-shell";
import { getAdminConversationChats } from "@/lib/admin/chats";
import { requireAdmin } from "@/lib/auth/session";

export default async function AdminConversationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  const chats = await getAdminConversationChats(admin.id);

  return (
    <div className="-mx-4 -my-3 flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden sm:-my-4">
      <AdminConversationsShell chats={chats}>{children}</AdminConversationsShell>
    </div>
  );
}
