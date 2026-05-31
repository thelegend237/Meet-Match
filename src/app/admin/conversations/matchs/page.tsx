import {
  AdminKpiCard,
  AdminKpiGrid,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { ChatsList } from "@/components/user/chats-list";
import { getAdminMatchChats } from "@/lib/user/chats";

export const metadata = {
  title: "Discussions matchs — Admin",
};

export default async function AdminMatchConversationsPage() {
  const chats = await getAdminMatchChats();
  const open = chats.filter((c) => c.status === "open").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Discussions matchs"
        description="Accompagnez les échanges entre les membres mis en relation."
        backHref="/admin/conversations"
        backLabel="Conversations contact"
      />

      <AdminKpiGrid cols={2}>
        <AdminKpiCard
          icon="messageSquare"
          label="Discussions"
          value={chats.length}
          accent="primary"
        />
        <AdminKpiCard
          icon="mailOpen"
          label="Ouvertes"
          value={open}
          accent="success"
        />
      </AdminKpiGrid>

      <ChatsList
        chats={chats}
        getHref={(chat) => `/admin/conversations/${chat.id}`}
      />
    </div>
  );
}
