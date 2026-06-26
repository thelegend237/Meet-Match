import { requireUser } from "@/lib/auth/session";
import { fetchUserNotifications } from "@/lib/notifications/queries";
import { NotificationsList } from "@/components/user/notifications-list";
import { NotificationPreferencesForm } from "@/components/user/notification-preferences";
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
        description="Restez informé de l'activité sur votre compte, par email et sur votre appareil."
      />
      <section className="mm-card p-4 sm:p-5">
        <h2 className="font-sans text-base font-bold text-[#2e1a47] sm:text-lg">
          Préférences de notification
        </h2>
        <p className="mt-1 text-sm text-[#6b5f7a]">
          Choisissez comment être alerté lorsque vous n&apos;êtes pas sur l&apos;application.
        </p>
        <div className="mt-4">
          <NotificationPreferencesForm
            notifyEmail={profile.notify_email ?? true}
            notifyPush={profile.notify_push ?? true}
          />
        </div>
      </section>
      <NotificationsList notifications={notifications} />
    </PageStack>
  );
}
