import { AdminKpiCard, AdminKpiGrid } from "@/components/admin/admin-page";
import { formatCurrency } from "@/lib/utils";

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  incompleteProfiles: number;
  matchesPending: number;
  matchesActive: number;
  matchesSuccess: number;
  matchesFailed: number;
  revenueRegistration: number;
  revenueMatching: number;
}

export function AdminStatsGrid({ stats }: { stats: AdminStats }) {
  return (
    <AdminKpiGrid cols={4}>
      <AdminKpiCard label="Total utilisateurs" value={stats.totalUsers} accent="primary" />
      <AdminKpiCard label="Utilisateurs actifs" value={stats.activeUsers} accent="success" />
      <AdminKpiCard
        label="Nouveaux (7 jours)"
        value={stats.newUsers}
        accent="secondary"
      />
      <AdminKpiCard
        label="Profils incomplets"
        value={stats.incompleteProfiles}
        hint="< 80% complétion"
        accent="warning"
      />
      <AdminKpiCard label="Matchs en attente" value={stats.matchesPending} accent="muted" />
      <AdminKpiCard label="Matchs actifs" value={stats.matchesActive} accent="secondary" />
      <AdminKpiCard label="Matchs réussis" value={stats.matchesSuccess} accent="success" />
      <AdminKpiCard label="Matchs échoués" value={stats.matchesFailed} accent="warning" />
      <AdminKpiCard
        label="Revenus inscription"
        value={formatCurrency(stats.revenueRegistration, "CAD")}
        accent="primary"
      />
      <AdminKpiCard
        label="Revenus matching"
        value={formatCurrency(stats.revenueMatching, "CAD")}
        accent="primary"
      />
    </AdminKpiGrid>
  );
}
