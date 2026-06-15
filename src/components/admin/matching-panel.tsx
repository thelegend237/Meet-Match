"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { proposeMatchAction } from "@/lib/actions/admin";
import { AdminEmptyState } from "@/components/admin/admin-page";
import { MatchCompareModal } from "@/components/admin/match-compare-modal";
import type { MatchProposalQueue } from "@/components/admin/matching-propose-section";
import { useAdminAction } from "@/hooks/use-admin-action";
import { getInitials } from "@/lib/chat/format";
import { ArrowRight, ChevronRight, Heart } from "lucide-react";
import type { MatchProposalPair } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface MatchingPanelProps {
  pairs: MatchProposalPair[];
  highlightUserId?: string;
  queue: Exclude<MatchProposalQueue, "manual">;
}

function formatSignalDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function PairAvatars({
  photoA,
  photoB,
  nameA,
  nameB,
}: {
  photoA: string | null;
  photoB: string | null;
  nameA: string;
  nameB: string;
}) {
  return (
    <div className="relative h-14 w-[4.25rem] shrink-0">
      <div className="absolute left-0 top-0 h-10 w-10 overflow-hidden rounded-full ring-2 ring-white">
        {photoA ? (
          <Image src={photoA} alt="" fill className="object-cover object-center" sizes="40px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#ede9fe] text-[11px] font-bold text-[#5b3d8f]">
            {getInitials(nameA).slice(0, 2)}
          </div>
        )}
      </div>
      <div className="absolute bottom-0 right-0 h-10 w-10 overflow-hidden rounded-full ring-2 ring-white">
        {photoB ? (
          <Image src={photoB} alt="" fill className="object-cover object-center" sizes="40px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#fce7f3] text-[11px] font-bold text-[#be185d]">
            {getInitials(nameB).slice(0, 2)}
          </div>
        )}
      </div>
    </div>
  );
}

function PairBadge({ pair }: { pair: MatchProposalPair }) {
  if (pair.source === "one_way") {
    return (
      <span className="inline-flex items-center gap-1 font-medium text-[#5b3d8f]">
        <ArrowRight className="h-3.5 w-3.5" />
        {pair.userAName} → {pair.userBName}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 font-medium text-[#be185d]">
      <Heart className="h-3.5 w-3.5 fill-[#fce7f3] text-[#e91e8c]" />
      Like réciproque
    </span>
  );
}

function PairCard({
  pair,
  onSelect,
}: {
  pair: MatchProposalPair;
  onSelect: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="mm-admin-pair-card cursor-pointer"
    >
      <div className="mm-admin-pair-card-inner">
        <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5">
          <PairAvatars
            photoA={pair.profileA.primary_photo_url ?? pair.profileA.photos[0] ?? null}
            photoB={pair.profileB.primary_photo_url ?? pair.profileB.photos[0] ?? null}
            nameA={pair.userAName}
            nameB={pair.userBName}
          />

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="space-y-1">
              <Link
                href={`/admin/utilisateurs/${pair.userAId}`}
                onClick={(e) => e.stopPropagation()}
                className="block truncate text-left text-[15px] font-semibold leading-snug text-primary hover:text-secondary hover:underline sm:text-[16px]"
              >
                {pair.userAName}
              </Link>
              <Link
                href={`/admin/utilisateurs/${pair.userBId}`}
                onClick={(e) => e.stopPropagation()}
                className="block truncate text-left text-[15px] font-semibold leading-snug text-primary hover:text-secondary hover:underline sm:text-[16px]"
              >
                {pair.userBName}
              </Link>
            </div>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground sm:text-sm">
              <PairBadge pair={pair} />
              {pair.signalAt && (
                <>
                  <span aria-hidden>·</span>
                  <span>{formatSignalDate(pair.signalAt)}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center sm:pl-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={cn(
              "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white shadow-md transition-all sm:w-auto",
              "bg-gradient-to-r from-[#7b3d8f] to-[#e91e8c] hover:shadow-lg hover:brightness-105"
            )}
          >
            Comparer les profils
            <ChevronRight className="h-4 w-4 stroke-[2]" />
          </button>
        </div>
      </div>
    </div>
  );
}

const EMPTY_COPY: Record<
  Exclude<MatchProposalQueue, "manual">,
  { title: string; message: string }
> = {
  mutual: {
    title: "Aucun couple en attente",
    message: "Les likes réciproques apparaîtront ici pour analyse et proposition.",
  },
  one_way: {
    title: "Aucun like à sens unique",
    message:
      "Les intérêts unidirectionnels (une seule personne a liké) apparaîtront ici.",
  },
};

export function MatchingPanel({
  pairs,
  highlightUserId,
  queue,
}: MatchingPanelProps) {
  const { pending, run } = useAdminAction();
  const [selected, setSelected] = useState<MatchProposalPair | null>(null);

  const displayPairs = useMemo(() => {
    if (!highlightUserId) return pairs;
    const filtered = pairs.filter(
      (p) => p.userAId === highlightUserId || p.userBId === highlightUserId
    );
    return filtered.length > 0 ? filtered : pairs;
  }, [pairs, highlightUserId]);

  useEffect(() => {
    if (!highlightUserId || displayPairs.length === 0) return;
    const first = displayPairs.find(
      (p) => p.userAId === highlightUserId || p.userBId === highlightUserId
    );
    if (first) setSelected(first);
  }, [highlightUserId, displayPairs]);

  function propose(userAId: string, userBId: string) {
    if (!confirm("Proposer ce match aux deux utilisateurs ?")) return;
    void run(() => proposeMatchAction(userAId, userBId), {
      success: "Match proposé avec succès.",
      onSuccess: () => setSelected(null),
    });
  }

  if (displayPairs.length === 0) {
    const copy = EMPTY_COPY[queue];
    return (
      <AdminEmptyState icon="users" title={copy.title} message={copy.message} />
    );
  }

  const listLabel =
    queue === "one_way"
      ? "couple(s) avec like à sens unique"
      : "couple(s) avec likes réciproques";

  return (
    <>
      <section className="mm-card overflow-hidden">
        <div className="border-b border-border/50 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-primary">Couples à analyser</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {displayPairs.length.toLocaleString("fr-FR")} {listLabel}
            {highlightUserId && displayPairs.length < pairs.length && (
              <>
                {" "}
                · filtré sur le membre sélectionné ({displayPairs.length} sur{" "}
                {pairs.length})
              </>
            )}
          </p>
        </div>

        <div className="bg-[#f8f6fc] p-4 sm:p-5">
          <div className="mm-admin-pair-list">
            {displayPairs.map((pair) => (
              <PairCard
                key={`${pair.source}-${pair.userAId}-${pair.userBId}`}
                pair={pair}
                onSelect={() => setSelected(pair)}
              />
            ))}
          </div>
        </div>
      </section>

      <MatchCompareModal
        pair={selected}
        pending={pending}
        onClose={() => setSelected(null)}
        onPropose={propose}
      />
    </>
  );
}
