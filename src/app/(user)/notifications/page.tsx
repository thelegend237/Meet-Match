import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { NotificationsList } from "@/components/user/notifications-list";
import { PageHeader, PageStack } from "@/components/layout/page-header";
import type { Notification } from "@/lib/types/database";

export const metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
  await requireUser();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <PageStack>
      <PageHeader
        title="Notifications"
        description="Restez informé de l'activité sur votre compte."
      />
      <NotificationsList notifications={(notifications as Notification[]) ?? []} />
    </PageStack>
  );
}
