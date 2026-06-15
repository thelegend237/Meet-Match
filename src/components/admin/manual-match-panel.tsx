"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { Loader2, Search, User, X } from "lucide-react";
import {
  getMatchingCandidateAction,
  loadMatchProposalPairAction,
  proposeMatchAction,
  searchMatchingCandidatesAction,
} from "@/lib/actions/admin";
import { AdminEmptyState } from "@/components/admin/admin-page";
import { MatchCompareModal } from "@/components/admin/match-compare-modal";
import { useAdminAction } from "@/hooks/use-admin-action";
import { getInitials } from "@/lib/chat/format";
import type { MatchProposalPair } from "@/lib/types/database";
import { cn } from "@/lib/utils";

type Candidate = {
  id: string;
  display_name: string;
  email: string;
  primary_photo_url: string | null;
  city: string | null;
  country_code: string | null;
};

function UserPicker({
  label,
  selected,
  onSelect,
  excludeUserId,
}: {
  label: string;
  selected: Candidate | null;
  onSelect: (user: Candidate | null) => void;
  excludeUserId?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const search = useCallback(
    (value: string) => {
      setQuery(value);
      if (value.trim().length < 2) {
        setResults([]);
        return;
      }
      startTransition(async () => {
        const res = await searchMatchingCandidatesAction(value, excludeUserId);
        setResults(res.candidates ?? []);
      });
    },
    [excludeUserId]
  );

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-primary">{label}</p>

      {selected ? (
        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-white px-3 py-2.5 shadow-sm">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#ede9fe]">
            {selected.primary_photo_url ? (
              <Image
                src={selected.primary_photo_url}
                alt=""
                fill
                className="object-cover object-center"
                sizes="40px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#5b3d8f]">
                {getInitials(selected.display_name || selected.email).slice(0, 2)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-primary">
              {selected.display_name || selected.email}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {selected.email}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
            aria-label="Retirer la sélection"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => search(e.target.value)}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Rechercher par nom ou e-mail…"
            className="h-11 w-full rounded-xl border border-border/60 bg-white pl-10 pr-3 text-sm shadow-sm focus-visible:border-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/20"
          />
          {open && (pending || results.length > 0 || query.trim().length >= 2) && (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border/60 bg-white py-1 shadow-lg">
              {pending && (
                <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Recherche…
                </li>
              )}
              {!pending &&
                results.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onSelect(user);
                        setQuery("");
                        setResults([]);
                        setOpen(false);
                      }}
                    >
                      <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[#ede9fe]">
                        {user.primary_photo_url ? (
                          <Image
                            src={user.primary_photo_url}
                            alt=""
                            fill
                            className="object-cover object-center"
                            sizes="36px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <User className="h-4 w-4 text-[#5b3d8f]" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-primary">
                          {user.display_name || user.email}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              {!pending && query.trim().length >= 2 && results.length === 0 && (
                <li className="px-3 py-2.5 text-sm text-muted-foreground">
                  Aucun membre trouvé
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function ManualMatchPanel({
  preselectedUserId,
}: {
  preselectedUserId?: string;
}) {
  const { pending, run } = useAdminAction();
  const [userA, setUserA] = useState<Candidate | null>(null);
  const [userB, setUserB] = useState<Candidate | null>(null);
  const [selected, setSelected] = useState<MatchProposalPair | null>(null);
  const [loadingPair, setLoadingPair] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!preselectedUserId) return;

    let cancelled = false;
    void getMatchingCandidateAction(preselectedUserId).then((res) => {
      if (!cancelled && res.candidate) {
        setUserA(res.candidate);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [preselectedUserId]);

  async function handleCompare() {
    if (!userA || !userB) return;
    setLoadingPair(true);
    setLoadError(null);
    const res = await loadMatchProposalPairAction(userA.id, userB.id);
    setLoadingPair(false);
    if (res.error || !res.pair) {
      setLoadError(res.error ?? "Couple indisponible.");
      return;
    }
    setSelected(res.pair);
  }

  function propose(userAId: string, userBId: string) {
    if (!confirm("Proposer ce match aux deux utilisateurs ?")) return;
    void run(() => proposeMatchAction(userAId, userBId), {
      success: "Match proposé avec succès.",
      onSuccess: () => {
        setSelected(null);
        setUserA(null);
        setUserB(null);
      },
    });
  }

  return (
    <>
      <section className="mm-card overflow-hidden">
        <div className="border-b border-border/50 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-primary">Création manuelle</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sélectionnez deux membres pour comparer leurs profils et proposer une
            mise en relation, sans like préalable.
          </p>
        </div>

        <div className="space-y-5 bg-[#f8f6fc] p-5 sm:p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <UserPicker
              label="Membre A"
              selected={userA}
              onSelect={setUserA}
              excludeUserId={userB?.id}
            />
            <UserPicker
              label="Membre B"
              selected={userB}
              onSelect={setUserB}
              excludeUserId={userA?.id}
            />
          </div>

          {loadError && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {loadError}
            </p>
          )}

          <button
            type="button"
            disabled={!userA || !userB || loadingPair}
            onClick={() => void handleCompare()}
            className={cn(
              "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl px-6 text-sm font-semibold text-white shadow-md transition-all sm:w-auto",
              "bg-gradient-to-r from-[#7b3d8f] to-[#e91e8c] hover:shadow-lg hover:brightness-105 disabled:opacity-50"
            )}
          >
            {loadingPair ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement…
              </>
            ) : (
              "Comparer les profils"
            )}
          </button>
        </div>
      </section>

      {!userA && !userB && !preselectedUserId && (
        <AdminEmptyState
          icon="users"
          title="Choisissez deux profils"
          message="Recherchez deux membres actifs pour lancer une comparaison manuelle."
        />
      )}

      <MatchCompareModal
        pair={selected}
        pending={pending}
        onClose={() => setSelected(null)}
        onPropose={propose}
      />
    </>
  );
}
