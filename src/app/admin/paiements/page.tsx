import Link from "next/link";
import {
  AdminKpiCard,
  AdminKpiGrid,
  AdminPageHeader,
  AdminTableBody,
  AdminTableHead,
  AdminTableRow,
  AdminTableShell,
  AdminTableTd,
  AdminTableTh,
  AdminEmptyState,
} from "@/components/admin/admin-page";
import { StatusBadge } from "@/components/admin/status-badge";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import type { Payment } from "@/lib/types/database";

export const metadata = {
  title: "Paiements — Admin",
};

export default async function AdminPaymentsPage() {
  const supabase = await createClient();

  const [{ data: payments }, { data: profiles }] = await Promise.all([
    supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("id, display_name, email"),
  ]);

  const nameById = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      p.display_name || p.email || "Utilisateur",
    ])
  );

  const rows = (payments as Payment[]) ?? [];
  const paid = rows.filter((p) => p.status === "paid" || p.status === "free").length;
  const revenue = rows
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Paiements"
        description="Historique des paiements inscription et matching."
      />

      <AdminKpiGrid cols={3}>
        <AdminKpiCard
          icon="creditCard"
          label="Transactions"
          value={rows.length}
          accent="primary"
        />
        <AdminKpiCard
          icon="checkCircle"
          label="Payées / gratuites"
          value={paid}
          accent="success"
        />
        <AdminKpiCard
          icon="euro"
          label="Revenus encaissés"
          value={formatCurrency(revenue, "EUR")}
          accent="secondary"
        />
      </AdminKpiGrid>

      {rows.length === 0 ? (
        <AdminEmptyState
          icon="creditCard"
          title="Aucun paiement"
          message="Les transactions apparaîtront ici dès qu'un membre paiera son inscription ou un match."
        />
      ) : (
        <AdminTableShell minWidth="720px">
          <AdminTableHead>
            <AdminTableTh>Utilisateur</AdminTableTh>
            <AdminTableTh>Type</AdminTableTh>
            <AdminTableTh>Montant</AdminTableTh>
            <AdminTableTh>Statut</AdminTableTh>
            <AdminTableTh>Date</AdminTableTh>
          </AdminTableHead>
          <AdminTableBody>
            {rows.map((payment) => (
              <AdminTableRow key={payment.id}>
                <AdminTableTd>
                  <Link
                    href={`/admin/utilisateurs/${payment.user_id}`}
                    className="font-medium text-primary hover:text-secondary hover:underline"
                  >
                    {nameById.get(payment.user_id) ?? "—"}
                  </Link>
                </AdminTableTd>
                <AdminTableTd className="capitalize">
                  {payment.type === "registration" ? "Inscription" : "Matching"}
                </AdminTableTd>
                <AdminTableTd className="font-semibold tabular-nums">
                  {formatCurrency(Number(payment.amount), payment.currency)}
                </AdminTableTd>
                <AdminTableTd>
                  <StatusBadge kind="payment" status={payment.status} />
                </AdminTableTd>
                <AdminTableTd className="text-muted-foreground">
                  {new Date(payment.created_at).toLocaleDateString("fr-FR")}
                </AdminTableTd>
              </AdminTableRow>
            ))}
          </AdminTableBody>
        </AdminTableShell>
      )}
    </div>
  );
}
