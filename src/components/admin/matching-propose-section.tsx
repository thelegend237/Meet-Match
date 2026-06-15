"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AdminSectionTabs } from "@/components/admin/admin-page";
import { ManualMatchPanel } from "@/components/admin/manual-match-panel";
import { MatchingPanel } from "@/components/admin/matching-panel";
import type { MatchProposalPair } from "@/lib/types/database";

export type MatchProposalQueue = "mutual" | "one_way" | "manual";

interface MatchingProposeSectionProps {
  mutualPairs: MatchProposalPair[];
  oneWayPairs: MatchProposalPair[];
  activeQueue: MatchProposalQueue;
  highlightUserId?: string;
}

export function MatchingProposeSection({
  mutualPairs,
  oneWayPairs,
  activeQueue,
  highlightUserId,
}: MatchingProposeSectionProps) {
  const queueTabs = useMemo(() => {
    const userQuery = highlightUserId ? `&user=${highlightUserId}` : "";
    return [
      {
        id: "mutual",
        label: "Likes réciproques",
        href: `/admin/matchs?tab=proposer&queue=mutual${userQuery}`,
        count: mutualPairs.length,
      },
      {
        id: "one_way",
        label: "Sens unique",
        href: `/admin/matchs?tab=proposer&queue=one_way${userQuery}`,
        count: oneWayPairs.length,
      },
      {
        id: "manual",
        label: "Création manuelle",
        href: `/admin/matchs?tab=proposer&queue=manual${userQuery}`,
      },
    ];
  }, [mutualPairs.length, oneWayPairs.length, highlightUserId]);

  const activePairs =
    activeQueue === "one_way" ? oneWayPairs : mutualPairs;

  return (
    <div className="space-y-4">
      <AdminSectionTabs tabs={queueTabs} activeId={activeQueue} />

      {highlightUserId && (
        <p className="text-sm text-muted-foreground">
          Filtre membre actif —{" "}
          <Link
            href="/admin/matchs?tab=proposer"
            className="font-medium text-secondary hover:underline"
          >
            Afficher tous les couples
          </Link>
        </p>
      )}

      {activeQueue === "manual" ? (
        <ManualMatchPanel preselectedUserId={highlightUserId} />
      ) : (
        <MatchingPanel
          pairs={activePairs}
          highlightUserId={highlightUserId}
          queue={activeQueue}
        />
      )}
    </div>
  );
}
