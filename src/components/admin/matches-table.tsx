"use client";

import { updateMatchStatusAction } from "@/lib/actions/admin";
import {
  AdminEmptyState,
  AdminTableBody,
  AdminTableHead,
  AdminTableRow,
  AdminTableShell,
  AdminTableTd,
  AdminTableTh,
} from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/status-badge";
import { useAdminAction } from "@/hooks/use-admin-action";

export interface AdminMatchRow {
  id: string;
  userAName: string;
  userBName: string;
  status: string;
  proposedAt: string;
}

interface MatchesTableProps {
  matches: AdminMatchRow[];
}

export function MatchesTable({ matches }: MatchesTableProps) {
  const { pending, run } = useAdminAction();

  function updateStatus(
    matchId: string,
    status: "success" | "failed" | "cancelled"
  ) {
    const labels = { success: "réussi", failed: "échoué", cancelled: "annulé" };
    if (!confirm(`Marquer ce match comme ${labels[status]} ?`)) return;
    void run(() => updateMatchStatusAction(matchId, status), {
      success: "Statut du match mis à jour.",
    });
  }

  if (matches.length === 0) {
    return (
      <AdminEmptyState
        icon="gitMerge"
        title="Aucun match"
        message="Les mises en relation proposées apparaîtront ici."
      />
    );
  }

  return (
    <AdminTableShell minWidth="640px">
      <AdminTableHead>
        <AdminTableTh>Couple</AdminTableTh>
        <AdminTableTh>Statut</AdminTableTh>
        <AdminTableTh>Proposé le</AdminTableTh>
        <AdminTableTh>Actions</AdminTableTh>
      </AdminTableHead>
      <AdminTableBody>
        {matches.map((match) => (
          <AdminTableRow key={match.id}>
            <AdminTableTd className="font-medium">
              {match.userAName} & {match.userBName}
            </AdminTableTd>
            <AdminTableTd>
              <StatusBadge kind="match" status={match.status} />
            </AdminTableTd>
            <AdminTableTd className="text-muted-foreground">
              {new Date(match.proposedAt).toLocaleDateString("fr-FR")}
            </AdminTableTd>
            <AdminTableTd>
              {match.status === "active" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => updateStatus(match.id, "success")}
                  >
                    Réussi
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => updateStatus(match.id, "failed")}
                  >
                    Échoué
                  </Button>
                </div>
              )}
              {(match.status === "pending_payment" ||
                match.status === "pending") && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => updateStatus(match.id, "cancelled")}
                >
                  Annuler
                </Button>
              )}
            </AdminTableTd>
          </AdminTableRow>
        ))}
      </AdminTableBody>
    </AdminTableShell>
  );
}
