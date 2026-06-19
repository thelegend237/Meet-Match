import {
  CheckCircle2,
  CreditCard,
  Euro,
  AlertCircle,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page";
import {
  PaymentsTable,
  type PaymentUserInfo,
} from "@/components/admin/payments-table";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, cn } from "@/lib/utils";
import type { Payment } from "@/lib/types/database";
import { PageStack } from "@/components/layout/page-header";

export const metadata = {
  title: "Paiements — Admin",
};

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  iconClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint: string;
  iconClassName: string;
}) {
  return (
    <article className="mm-admin-stat-card">
      <div className="flex items-start gap-3.5">
        <div
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:h-11 sm:w-11",
            iconClassName
          )}
        >
          <Icon className="h-[18px] w-[18px] stroke-[1.75] sm:h-5 sm:w-5" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-[13px] font-medium leading-[1.2] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-[1.65rem] font-bold leading-none tracking-tight text-primary sm:mt-2.5 sm:text-[1.75rem]">
            {value}
          </p>
          <p className="mt-2 text-[11px] font-semibold leading-none text-emerald-600 sm:mt-2.5">
            {hint}
          </p>
        </div>
      </div>
    </article>
  );
}

export default async function AdminPaymentsPage() {
  const supabase = await createClient();

  const [{ data: payments }, { data: profiles }] = await Promise.all([
    supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("profiles")
      .select("id, display_name, email, primary_photo_url"),
  ]);

  const usersById = (profiles ?? []).reduce<
    Record<string, PaymentUserInfo>
  >((acc, profile) => {
    acc[profile.id] = {
      name: profile.display_name || profile.email || "Utilisateur",
      email: profile.email,
      photo: profile.primary_photo_url ?? null,
    };
    return acc;
  }, {});

  const rows = (payments as Payment[]) ?? [];
  const paidOrFree = rows.filter(
    (p) => p.status === "paid" || p.status === "free"
  ).length;
  const unpaid = rows.filter((p) => p.status === "unpaid").length;
  const revenue = rows
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <PageStack>
      <AdminPageHeader
        title="Paiements"
        description="Suivi des transactions d'inscription et de matching, avec export CSV."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={CreditCard}
          label="Transactions"
          value={rows.length}
          hint="Historique complet"
          iconClassName="bg-[#ede9fe] text-[#5b3d8f]"
        />
        <StatTile
          icon={CheckCircle2}
          label="Payées / gratuites"
          value={paidOrFree}
          hint={`${rows.length ? Math.round((paidOrFree / rows.length) * 100) : 0} % du total`}
          iconClassName="bg-[#dcfce7] text-[#15803d]"
        />
        <StatTile
          icon={AlertCircle}
          label="Impayées"
          value={unpaid}
          hint={unpaid > 0 ? "À relancer" : "Aucune en attente"}
          iconClassName="bg-[#ffedd5] text-[#c2410c]"
        />
        <StatTile
          icon={Euro}
          label="Revenus encaissés"
          value={formatCurrency(revenue, "CAD")}
          hint="Paiements confirmés"
          iconClassName="bg-[#fce7f3] text-[#e91e8c]"
        />
      </div>

      <PaymentsTable payments={rows} usersById={usersById} />
    </PageStack>
  );
}
