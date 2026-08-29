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
  getAdminUserCounts,
  getUsersWithSummaryStatsPaginated,
} from "@/lib/admin/users";
import { PageStack } from "@/components/layout/page-header";

export const metadata = {
  title: "Utilisateurs — Admin",
};

export default async function AdminUsersPage() {
  const [userList, countryOptions, counts] = await Promise.all([
    getUsersWithSummaryStatsPaginated(),
    getDistinctUserCountries(),
    getAdminUserCounts(),
  ]);

  const { users, totalRegistered, truncated } = userList;

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
          value={counts.total}
          accent="primary"
        />
        <AdminKpiCard
          icon="userCheck"
          label="Comptes actifs"
          value={counts.active}
          accent="success"
        />
        <AdminKpiCard
          icon="checkCircle"
          label="Accès plateforme actif"
          value={counts.withPlatformAccess}
          accent="secondary"
        />
      </AdminKpiGrid>

      <Suspense fallback={null}>
        <AdminUsersAlert />
      </Suspense>

      <UsersTable
        users={users}
        countryOptions={countryOptions}
        totalRegistered={totalRegistered}
        truncated={truncated}
      />
    </PageStack>
  );
}
