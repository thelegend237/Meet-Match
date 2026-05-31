import {
  AdminKpiCard,
  AdminKpiGrid,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { MatchesTable } from "@/components/admin/matches-table";
import { getAdminMatches } from "@/lib/admin/matches";

export const metadata = {
  title: "Matchs — Admin",
};

export default async function AdminMatchsPage() {
  const matches = await getAdminMatches();

  const active = matches.filter((m) => m.status === "active").length;
  const success = matches.filter((m) => m.status === "success").length;
  const pending = matches.filter(
    (m) => m.status === "pending" || m.status === "pending_payment"
  ).length;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Matchs"
        description="Suivi des mises en relation et clôture des matchs actifs."
      />

      <AdminKpiGrid cols={4}>
        <AdminKpiCard
          icon="gitMerge"
          label="Total matchs"
          value={matches.length}
          accent="primary"
        />
        <AdminKpiCard
          icon="clock"
          label="En attente"
          value={pending}
          accent="warning"
        />
        <AdminKpiCard
          icon="gitMerge"
          label="Actifs"
          value={active}
          accent="secondary"
        />
        <AdminKpiCard
          icon="checkCircle"
          label="Réussis"
          value={success}
          accent="success"
        />
      </AdminKpiGrid>

      <MatchesTable matches={matches} />
    </div>
  );
}
