import { AdminNotifications } from "@/components/admin/admin-notifications";
import { getAdminNotifications } from "@/lib/admin/notifications";
import { requireAdmin } from "@/lib/auth/session";
import { PageStack } from "@/components/layout/page-header";

export const metadata = {
  title: "Notifications — Admin",
};

export default async function AdminNotificationsPage() {
  const profile = await requireAdmin();
  const { notifications, summary } = await getAdminNotifications();
  const firstName = profile.display_name?.split(" ")[0] ?? "Admin";

  return (
    <PageStack>
      <header className="min-w-0">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-primary sm:text-3xl">
          Notifications
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Suivez en un coup d&apos;œil tout ce qui nécessite votre intervention
          sur Meet & Match.
        </p>
      </header>

      <AdminNotifications
        notifications={notifications}
        summary={summary}
        adminName={firstName}
      />
    </PageStack>
  );
}
