"use client";

import { useState } from "react";
import { proposeMatchAction } from "@/lib/actions/admin";
import { AdminEmptyState, AdminListCard } from "@/components/admin/admin-page";
import { Button } from "@/components/ui/button";
import { MatchCompareModal } from "@/components/admin/match-compare-modal";
import { useAdminAction } from "@/hooks/use-admin-action";
import Image from "next/image";
import { ChevronRight, Heart } from "lucide-react";
import type { MutualLikePair } from "@/lib/types/database";

interface MatchingPanelProps {
  pairs: MutualLikePair[];
}

export function MatchingPanel({ pairs }: MatchingPanelProps) {
  const { pending, run } = useAdminAction();
  const [selected, setSelected] = useState<MutualLikePair | null>(null);

  function propose(userAId: string, userBId: string) {
    if (!confirm("Proposer ce match aux deux utilisateurs ?")) return;
    void run(
      () => proposeMatchAction(userAId, userBId),
      {
        success: "Match proposé avec succès.",
        onSuccess: () => setSelected(null),
      }
    );
  }

  if (pairs.length === 0) {
    return (
      <AdminEmptyState
        icon="users"
        title="Aucun couple en attente"
        message="Les likes réciproques apparaîtront ici pour analyse et proposition."
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {pairs.map((pair) => (
          <AdminListCard
            key={`${pair.userAId}-${pair.userBId}`}
            onClick={() => setSelected(pair)}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex -space-x-2">
                  {pair.profileA.primary_photo_url ? (
                    <Image
                      src={pair.profileA.primary_photo_url}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full border-2 border-card object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-muted text-xs">
                      A
                    </div>
                  )}
                  {pair.profileB.primary_photo_url ? (
                    <Image
                      src={pair.profileB.primary_photo_url}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full border-2 border-card object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-card bg-muted text-xs">
                      B
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-primary">
                    {pair.userAName}{" "}
                    <span className="text-secondary">&</span> {pair.userBName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Like réciproque ·{" "}
                    {new Date(pair.mutualAt).toLocaleDateString("fr-FR")} · Cliquer
                    pour comparer
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-center">
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelected(pair);
                  }}
                >
                  Comparer
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  type="button"
                  disabled={pending}
                  onClick={(e) => {
                    e.stopPropagation();
                    propose(pair.userAId, pair.userBId);
                  }}
                >
                  <Heart className="mr-1 h-4 w-4" />
                  Proposer
                </Button>
              </div>
            </div>
          </AdminListCard>
        ))}
      </div>

      <MatchCompareModal
        pair={selected}
        pending={pending}
        onClose={() => setSelected(null)}
        onPropose={propose}
      />
    </>
  );
}
