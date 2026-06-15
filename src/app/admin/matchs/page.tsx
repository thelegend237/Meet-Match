import {
  CheckCircle2,
  Clock,
  GitMerge,
  Heart,
} from "lucide-react";
import {
  AdminPageHeader,
  AdminSectionTabs,
} from "@/components/admin/admin-page";
import { MatchesTable } from "@/components/admin/matches-table";
import {
  MatchingProposeSection,
  type MatchProposalQueue,
} from "@/components/admin/matching-propose-section";
import { getAdminMatches } from "@/lib/admin/matches";
import {
  getMutualLikePairs,
  getOneWayLikePairs,
} from "@/lib/admin/matching";
import { PageStack } from "@/components/layout/page-header";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Matchs — Admin",
};

interface PageProps {
  searchParams: Promise<{ tab?: string; queue?: string; user?: string }>;
}

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

function parseQueue(value?: string): MatchProposalQueue {
  if (value === "one_way" || value === "manual") return value;
  return "mutual";
}

export default async function AdminMatchsPage({ searchParams }: PageProps) {
  const { tab, queue, user: highlightUserId } = await searchParams;
  const activeTab = tab === "proposer" ? "proposer" : "suivi";
  const activeQueue = parseQueue(queue);

  const [matches, mutualPairs, oneWayPairs] = await Promise.all([
    getAdminMatches(),
    getMutualLikePairs(),
    getOneWayLikePairs(),
  ]);

  const active = matches.filter((m) => m.status === "active").length;
  const success = matches.filter((m) => m.status === "success").length;
  const pending = matches.filter(
    (m) => m.status === "pending" || m.status === "pending_payment"
  ).length;
  const failed = matches.filter((m) => m.status === "failed").length;

  const proposeCount = mutualPairs.length + oneWayPairs.length;

  const tabs = [
    {
      id: "suivi",
      label: "Suivi des matchs",
      href: "/admin/matchs",
      count: matches.length,
    },
    {
      id: "proposer",
      label: "Proposer un match",
      href: "/admin/matchs?tab=proposer",
      count: proposeCount,
    },
  ];

  return (
    <PageStack>
      <AdminPageHeader
        title="Matchs"
        description={
          activeTab === "proposer"
            ? "Likes réciproques, intérêts à sens unique ou sélection manuelle — comparez les profils avant de proposer une mise en relation."
            : "Suivi des mises en relation, clôture des matchs actifs et export CSV."
        }
      />

      <AdminSectionTabs tabs={tabs} activeId={activeTab} />

      {activeTab === "suivi" ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile
              icon={GitMerge}
              label="Total matchs"
              value={matches.length}
              hint="Toutes propositions"
              iconClassName="bg-[#ede9fe] text-[#5b3d8f]"
            />
            <StatTile
              icon={Clock}
              label="En attente"
              value={pending}
              hint="Paiement ou validation"
              iconClassName="bg-[#ffedd5] text-[#c2410c]"
            />
            <StatTile
              icon={Heart}
              label="Actifs"
              value={active}
              hint="Discussions en cours"
              iconClassName="bg-[#fce7f3] text-[#e91e8c]"
            />
            <StatTile
              icon={CheckCircle2}
              label="Réussis"
              value={success}
              hint={
                failed > 0 ? `${failed} échoué${failed > 1 ? "s" : ""}` : "Objectif atteint"
              }
              iconClassName="bg-[#dcfce7] text-[#15803d]"
            />
          </div>

          <MatchesTable matches={matches} />
        </>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <StatTile
              icon={Heart}
              label="Likes réciproques"
              value={mutualPairs.length}
              hint="Priorité haute"
              iconClassName="bg-[#fce7f3] text-[#e91e8c]"
            />
            <StatTile
              icon={GitMerge}
              label="Sens unique"
              value={oneWayPairs.length}
              hint="Un seul like"
              iconClassName="bg-[#ede9fe] text-[#5b3d8f]"
            />
            <StatTile
              icon={CheckCircle2}
              label="Création manuelle"
              value="—"
              hint="À la demande"
              iconClassName="bg-[#dcfce7] text-[#15803d]"
            />
          </div>

          <MatchingProposeSection
            mutualPairs={mutualPairs}
            oneWayPairs={oneWayPairs}
            activeQueue={activeQueue}
            highlightUserId={highlightUserId ?? undefined}
          />
        </>
      )}
    </PageStack>
  );
}
