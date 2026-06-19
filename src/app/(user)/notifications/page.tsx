import { requireUser } from "@/lib/auth/session";
import { fetchUserNotifications } from "@/lib/notifications/queries";
import { NotificationsList } from "@/components/user/notifications-list";
import { PageHeader, PageStack } from "@/components/layout/page-header";

export const metadata = {
  title: "Notifications",
};

export default async function NotificationsPage() {
  const profile = await requireUser();
  const notifications = await fetchUserNotifications(profile.id);

  return (
    <PageStack>
      <PageHeader
        title="Notifications"
        description="Restez informé de l'activité sur votre compte."
      />
      <NotificationsList notifications={notifications} />
    </PageStack>
  );
}
