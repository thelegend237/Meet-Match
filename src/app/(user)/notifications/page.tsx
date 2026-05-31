import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { NotificationsList } from "@/components/user/notifications-list";
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
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-primary">Notifications</h1>
        <p className="mt-2 text-muted-foreground">
          Restez informé de l&apos;activité sur votre compte.
        </p>
      </div>
      <NotificationsList notifications={(notifications as Notification[]) ?? []} />
    </div>
  );
}
