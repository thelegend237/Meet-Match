import Link from "next/link";
import { Suspense } from "react";
import {
  MessageCircle,
  Plus,
  Users,
  Heart,
  CheckCircle2,
  WalletCards,
} from "lucide-react";
import { getAdminStats } from "@/lib/admin/stats";
import {
  getDistinctUserCountries,
  getUsersWithSummaryStats,
} from "@/lib/admin/users";
import { requireAdmin } from "@/lib/auth/session";
import { PageStack } from "@/components/layout/page-header";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AdminUsersAlert } from "@/components/admin/admin-users-alert";
import { UsersTable } from "@/components/admin/users-table";

const statIconStyles = [
  "bg-[#ede9fe] text-[#5b3d8f]",
  "bg-[#fce7f3] text-[#e91e8c]",
  "bg-[#ede9fe] text-[#5b3d8f]",
  "bg-[#fce7f3] text-[#e91e8c]",
  "bg-[#ede9fe] text-[#5b3d8f]",
] as const;

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

export default async function AdminDashboardPage() {
  const profile = await requireAdmin();
  const stats = await getAdminStats();
  const [users, countryOptions] = await Promise.all([
    getUsersWithSummaryStats(),
    getDistinctUserCountries(),
  ]);
  const firstName = profile.display_name?.split(" ")[0] ?? "Admin";

  const matchesProposed =
    stats.matchesPending +
    stats.matchesActive +
    stats.matchesSuccess +
    stats.matchesFailed;

  return (
    <PageStack>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-sans text-2xl font-bold tracking-tight text-primary sm:text-3xl">
            Bonjour <span className="text-secondary">{firstName}</span> 👋
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Voici un aperçu général de la plateforme Meet & Match.
          </p>
        </div>
        <Button
          variant="secondary"
          size="lg"
          className="rounded-xl px-6 shadow-md shadow-secondary/25"
          asChild
        >
          <Link href="/admin/matchs?tab=proposer">
            <Plus className="h-5 w-5" />
            Proposer un match
          </Link>
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatTile
          icon={Users}
          label="Utilisateurs inscrits"
          value={stats.totalUsers.toLocaleString("fr-FR")}
          hint={`↑ ${stats.newUsers} ce mois`}
          iconClassName={statIconStyles[0]}
        />
        <StatTile
          icon={Heart}
          label="Matchs proposés"
          value={matchesProposed.toLocaleString("fr-FR")}
          hint={`↑ ${stats.matchesPending} ce mois`}
          iconClassName={statIconStyles[1]}
        />
        <StatTile
          icon={CheckCircle2}
          label="Matchs réussis"
          value={stats.matchesSuccess.toLocaleString("fr-FR")}
          hint={`↑ ${stats.matchesActive} ce mois`}
          iconClassName={statIconStyles[2]}
        />
        <StatTile
          icon={WalletCards}
          label="Paiements totaux"
          value={formatCurrency(
            stats.revenueRegistration + stats.revenueMatching,
            "CAD"
          )}
          hint={`↑ ${Math.round((stats.revenueMatching / Math.max(stats.revenueRegistration + stats.revenueMatching, 1)) * 100)}% ce mois`}
          iconClassName={statIconStyles[3]}
        />
        <StatTile
          icon={MessageCircle}
          label="Discussions actives"
          value={stats.matchesActive.toLocaleString("fr-FR")}
          hint={`↑ ${stats.matchesPending} ce mois`}
          iconClassName={statIconStyles[4]}
        />
      </section>

      <Suspense fallback={null}>
        <AdminUsersAlert />
      </Suspense>

      <UsersTable users={users} countryOptions={countryOptions} />
    </PageStack>
  );
}
