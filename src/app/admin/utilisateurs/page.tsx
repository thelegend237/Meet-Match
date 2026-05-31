import {
  AdminKpiCard,
  AdminKpiGrid,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { UsersTable } from "@/components/admin/users-table";
import { getUsersWithSummaryStats } from "@/lib/admin/users";

export const metadata = {
  title: "Utilisateurs — Admin",
};

export default async function AdminUsersPage() {
  const users = await getUsersWithSummaryStats();

  const active = users.filter((u) => u.status === "active").length;
  const paid = users.filter(
    (u) =>
      u.registration_payment_status === "paid" ||
      u.registration_payment_status === "free"
  ).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Utilisateurs"
        description="Cliquez sur un membre pour voir son profil complet, son activité et son historique de matchs."
      />

      <AdminKpiGrid cols={3}>
        <AdminKpiCard
          icon="users"
          label="Membres inscrits"
          value={users.length}
          accent="primary"
        />
        <AdminKpiCard
          icon="userCheck"
          label="Comptes actifs"
          value={active}
          accent="success"
        />
        <AdminKpiCard
          icon="checkCircle"
          label="Accès plateforme actif"
          value={paid}
          accent="secondary"
        />
      </AdminKpiGrid>

      <UsersTable users={users} />
    </div>
  );
}
