import { requireAdmin } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/admin-shell";
import { NotificationLiveListener } from "@/components/user/notification-live-listener";
import { getAdminNotificationCount } from "@/lib/admin/notifications";

export const metadata = {
  title: "Administration",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();
  const notificationCount = await getAdminNotificationCount();

  return (
    <>
      <NotificationLiveListener userId={profile.id} isAdmin />
      <AdminShell
        displayName={profile.display_name || profile.email}
        role={profile.role}
        photoUrl={profile.primary_photo_url}
        profileCompletion={profile.profile_completion}
        notificationCount={notificationCount}
      >
        <div className="mm-admin-page-container">{children}</div>
      </AdminShell>
    </>
  );
}
