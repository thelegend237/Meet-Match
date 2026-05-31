import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { getUserMatches, countPendingMatchActions } from "@/lib/user/matches";
import { MatchesList } from "@/components/user/matches-list";

export const metadata = {
  title: "Mes matchs",
};

export default async function MatchsPage() {
  const profile = await requireUser();
  const matches = await getUserMatches(profile.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-primary">
          Mes matchs
        </h1>
        <p className="mt-2 text-muted-foreground">
          Mises en relation proposées par notre équipe et suivi de vos
          rencontres.
        </p>
      </div>

      <Suspense fallback={<div className="text-muted-foreground">Chargement…</div>}>
        <MatchesList matches={matches} />
      </Suspense>
    </div>
  );
}
