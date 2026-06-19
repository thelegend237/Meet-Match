import { requireAdmin } from "@/lib/auth/session";
import { getAdminLiveQueue } from "@/lib/admin/notifications";
import { fetchUserNotifications } from "@/lib/notifications/queries";
import { NotificationsList } from "@/components/user/notifications-list";
import { AdminLiveDiscussions } from "@/components/admin/admin-live-discussions";
import { PageStack } from "@/components/layout/page-header";

export const metadata = {
  title: "Notifications — Admin",
};

export default async function AdminNotificationsPage() {
  const profile = await requireAdmin();

  const [dbNotifications, live] = await Promise.all([
    fetchUserNotifications(profile.id),
    getAdminLiveQueue(),
  ]);

  const unreadDb = dbNotifications.filter((n) => !n.is_read).length;

  return (
    <PageStack>
      <header className="min-w-0">
        <h1 className="font-sans text-2xl font-bold tracking-tight text-primary sm:text-3xl">
          Notifications
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Alertes enregistrées et discussions actives nécessitant une réponse.
          {unreadDb > 0 && (
            <span className="font-medium text-secondary">
              {" "}
              {unreadDb} non lue{unreadDb > 1 ? "s" : ""}.
            </span>
          )}
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-primary">Centre de notifications</h2>
        <NotificationsList notifications={dbNotifications} isAdmin />
      </section>

      {live.notifications.length > 0 && (
        <AdminLiveDiscussions
          notifications={live.notifications}
          summary={live.summary}
        />
      )}
    </PageStack>
  );
}
