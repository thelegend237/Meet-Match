import { notFound } from "next/navigation";
import { AdminUserDetailView } from "@/components/admin/user-detail-view";
import { getAdminUserDetail } from "@/lib/admin/users";
import { requireAdmin } from "@/lib/auth/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const detail = await getAdminUserDetail(userId);
  return {
    title: detail
      ? `${detail.profile.display_name} — Admin`
      : "Utilisateur — Admin",
  };
}

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { userId } = await params;
  const [detail, currentAdmin] = await Promise.all([
    getAdminUserDetail(userId),
    requireAdmin(),
  ]);

  if (!detail) notFound();

  return (
    <AdminUserDetailView detail={detail} currentAdmin={currentAdmin} />
  );
}
