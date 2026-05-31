import {
  AdminKpiCard,
  AdminKpiGrid,
  AdminPageHeader,
} from "@/components/admin/admin-page";
import { MatchingPanel } from "@/components/admin/matching-panel";
import { getMutualLikes } from "@/lib/admin/matching";

export const metadata = {
  title: "Matching — Admin",
};

export default async function AdminMatchingPage() {
  const pairs = await getMutualLikes();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Matching"
        description="Couples avec likes réciproques — cliquez sur un couple pour comparer les profils avant de proposer une mise en relation."
      />

      <AdminKpiGrid cols={2}>
        <AdminKpiCard
          icon="heart"
          label="Couples en attente"
          value={pairs.length}
          accent="secondary"
        />
        <AdminKpiCard
          icon="users"
          label="Profils impliqués"
          value={pairs.length * 2}
          hint="Likes réciproques détectés"
          accent="primary"
        />
      </AdminKpiGrid>

      <MatchingPanel pairs={pairs} />
    </div>
  );
}
