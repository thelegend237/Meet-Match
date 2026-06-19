import { Suspense } from "react";
import {
  AdminKpiCard,
  AdminKpiGrid,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { AdminUsersAlert } from "@/components/admin/admin-users-alert";
import { UsersTable } from "@/components/admin/users-table";
import {
  getDistinctUserCountries,
  getUsersWithSummaryStats,
} from "@/lib/admin/users";
import { PageStack } from "@/components/layout/page-header";

export const metadata = {
  title: "Utilisateurs — Admin",
};

export default async function AdminUsersPage() {
  const [users, countryOptions] = await Promise.all([
    getUsersWithSummaryStats(),
    getDistinctUserCountries(),
  ]);

  const active = users.filter((u) => u.status === "active").length;
  const paid = users.filter(
    (u) =>
      u.registration_payment_status === "paid" ||
      u.registration_payment_status === "free"
  ).length;

  return (
    <PageStack>
      <AdminPageHeader
        title="Utilisateurs"
        description="Consultez les profils, gérez les rôles et suivez l'activité de chaque compte."
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

      <Suspense fallback={null}>
        <AdminUsersAlert />
      </Suspense>

      <UsersTable users={users} countryOptions={countryOptions} />
    </PageStack>
  );
}
