import { requireAdmin } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata = {
  title: "Administration",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  return (
    <AdminShell
      displayName={profile.display_name || profile.email}
      role={profile.role}
    >
      <div className="w-full px-4 py-4 sm:px-6 sm:py-6 xl:px-8 xl:py-8">
        {children}
      </div>
    </AdminShell>
  );
}
