import { requireAdmin } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/admin-shell";
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
    <AdminShell
      displayName={profile.display_name || profile.email}
      role={profile.role}
      photoUrl={profile.primary_photo_url}
      notificationCount={notificationCount}
    >
      <div className="mm-admin-page-container">{children}</div>
    </AdminShell>
  );
}
