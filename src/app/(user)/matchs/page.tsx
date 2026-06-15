import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { getUserMatches } from "@/lib/user/matches";
import { MatchesList } from "@/components/user/matches-list";
import { PageHeader, PageStack } from "@/components/layout/page-header";

export const metadata = {
  title: "Mes matchs",
};

export default async function MatchsPage() {
  const profile = await requireUser();
  const matches = await getUserMatches(profile.id);

  return (
    <PageStack>
      <PageHeader
        title="Mes matchs"
        description="Mises en relation proposées par notre équipe et suivi de vos rencontres."
      />
      <Suspense
        fallback={
          <div className="mm-card p-8 text-center text-muted-foreground">
            Chargement…
          </div>
        }
      >
        <MatchesList matches={matches} />
      </Suspense>
    </PageStack>
  );
}
