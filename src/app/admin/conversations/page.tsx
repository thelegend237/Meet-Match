import Link from "next/link";
import {
  AdminEmptyState,
  AdminKpiCard,
  AdminKpiGrid,
  AdminListCard,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Conversations — Admin",
};

export default async function AdminConversationsPage() {
  const supabase = await createClient();

  const { data: chats } = await supabase
    .from("chats")
    .select("id, subject, contact_name, contact_email, status, created_at, type")
    .eq("type", "admin_contact")
    .order("created_at", { ascending: false });

  const rows = chats ?? [];
  const open = rows.filter((c) => c.status === "open").length;
  const closed = rows.filter((c) => c.status === "closed").length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Conversations"
        description="Messages reçus via le formulaire de contact et échanges admin."
        action={
          <Link
            href="/admin/conversations/matchs"
            className="inline-flex items-center rounded-xl border border-border/60 bg-card px-4 py-2 text-sm font-medium text-primary shadow-sm transition-colors hover:border-secondary/30 hover:bg-muted/20"
          >
            Discussions matchs →
          </Link>
        }
      />

      <AdminKpiGrid cols={3}>
        <AdminKpiCard
          icon="messageSquare"
          label="Conversations"
          value={rows.length}
          accent="primary"
        />
        <AdminKpiCard
          icon="mailOpen"
          label="Ouvertes"
          value={open}
          accent="success"
        />
        <AdminKpiCard
          icon="mail"
          label="Fermées"
          value={closed}
          accent="muted"
        />
      </AdminKpiGrid>

      {rows.length === 0 ? (
        <AdminEmptyState
          icon="messageSquare"
          title="Aucune conversation"
          message="Les messages du formulaire de contact apparaîtront ici."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((chat) => (
            <AdminListCard key={chat.id} href={`/admin/conversations/${chat.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-primary">
                    {chat.contact_name || chat.subject || "Contact anonyme"}
                  </p>
                  {chat.contact_email && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {chat.contact_email}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(chat.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                <Badge variant={chat.status === "open" ? "success" : "outline"}>
                  {chat.status === "open" ? "Ouvert" : "Fermé"}
                </Badge>
              </div>
            </AdminListCard>
          ))}
        </div>
      )}
    </div>
  );
}
