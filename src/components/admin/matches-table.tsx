"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  MessageCircle,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { updateMatchStatusAction } from "@/lib/actions/admin";
import { matchStatusLabels } from "@/lib/admin/labels";
import type { AdminMatchRow } from "@/lib/admin/matches";
import { getInitials } from "@/lib/chat/format";
import { StatusBadge } from "@/components/admin/status-badge";
import { useAdminAction } from "@/hooks/use-admin-action";
import { cn } from "@/lib/utils";

interface MatchesTableProps {
  matches: AdminMatchRow[];
}

type StatusFilter =
  | "all"
  | "pending"
  | "pending_payment"
  | "active"
  | "success"
  | "failed"
  | "cancelled";

type PeriodFilter = "all" | "30" | "90" | "365";

const PAGE_SIZE = 10;

function formatMatchDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function CoupleAvatars({
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

function CoupleCell({ match }: { match: AdminMatchRow }) {
  return (
    <div className="flex items-center gap-4 sm:gap-5">
      <CoupleAvatars
        photoA={match.userAPhoto}
        photoB={match.userBPhoto}
        nameA={match.userAName}
        nameB={match.userBName}
      />
      <div className="min-w-0 space-y-1">
        <Link
          href={`/admin/utilisateurs/${match.userAId}`}
          className="block truncate text-[15px] font-semibold leading-snug text-primary hover:text-secondary hover:underline"
        >
          {match.userAName}
        </Link>
        <Link
          href={`/admin/utilisateurs/${match.userBId}`}
          className="block truncate text-[15px] font-semibold leading-snug text-primary hover:text-secondary hover:underline"
        >
          {match.userBName}
        </Link>
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  const pages = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items: (number | "ellipsis")[] = [1];
    if (page > 3) items.push("ellipsis");
    const middle = [page - 1, page, page + 1].filter(
      (p) => p > 1 && p < totalPages
    );
    items.push(...middle);
    if (page < totalPages - 2) items.push("ellipsis");
    if (totalPages > 1) items.push(totalPages);
    return items;
  }, [page, totalPages]);

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 px-5 py-4 sm:px-6">
      <p className="text-sm text-muted-foreground">
        Affichage {start} à {end} sur {totalItems.toLocaleString("fr-FR")} matchs
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="mm-admin-pagination-btn disabled:opacity-40"
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((item, index) =>
          item === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-sm text-muted-foreground"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={cn(
                "mm-admin-pagination-btn",
                page === item && "mm-admin-pagination-btn-active"
              )}
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="mm-admin-pagination-btn disabled:opacity-40"
          aria-label="Page suivante"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function MatchesTable({ matches }: MatchesTableProps) {
  const { pending, run } = useAdminAction();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();

    return matches.filter((match) => {
      if (q) {
        const haystack = [
          match.userAName,
          match.userBName,
          matchStatusLabels[match.status] ?? match.status,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (statusFilter !== "all" && match.status !== statusFilter) return false;

      if (periodFilter !== "all") {
        const days = Number(periodFilter);
        const cutoff = now - days * 24 * 60 * 60 * 1000;
        if (new Date(match.proposedAt).getTime() < cutoff) return false;
      }

      return true;
    });
  }, [matches, query, statusFilter, periodFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, periodFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  function updateStatus(
    matchId: string,
    status: "success" | "failed" | "cancelled"
  ) {
    const labels = { success: "réussi", failed: "échoué", cancelled: "annulé" };
    if (!confirm(`Marquer ce match comme ${labels[status]} ?`)) return;
    void run(() => updateMatchStatusAction(matchId, status), {
      success: "Statut du match mis à jour.",
    });
  }

  function exportCsv() {
    if (exporting) return;
    setExporting(true);

    const header = [
      "Membre A",
      "Membre B",
      "Statut",
      "Proposé le",
      "Match ID",
      "Discussion ID",
    ];

    const rows = filtered.map((match) => [
      match.userAName,
      match.userBName,
      matchStatusLabels[match.status] ?? match.status,
      formatMatchDate(match.proposedAt),
      match.id,
      match.chatId ?? "",
    ]);

    const csv = [header, ...rows]
      .map((line) =>
        line
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `matchs-meet-match-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(false), 300);
  }

  return (
    <div className="space-y-4">
      <section className="mm-admin-filter-bar">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:gap-5">
          <div className="relative min-w-0 w-full xl:min-w-[220px] xl:flex-[1.45]">
            <input
              id="admin-match-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un couple..."
              aria-label="Rechercher un match"
              className="mm-admin-filter-input pr-10"
            />
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:contents">
            <div className="min-w-0 xl:min-w-[170px] xl:flex-1">
              <label htmlFor="admin-match-status" className="mm-admin-filter-label">
                Statut
              </label>
              <div className="relative">
                <select
                  id="admin-match-status"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as StatusFilter)
                  }
                  className="mm-admin-filter-input appearance-none pr-9"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="pending">En attente</option>
                  <option value="pending_payment">Paiement requis</option>
                  <option value="active">Actif</option>
                  <option value="success">Réussi</option>
                  <option value="failed">Échoué</option>
                  <option value="cancelled">Annulé</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="min-w-0 xl:min-w-[170px] xl:flex-1">
              <label htmlFor="admin-match-period" className="mm-admin-filter-label">
                Période
              </label>
              <div className="relative">
                <select
                  id="admin-match-period"
                  value={periodFilter}
                  onChange={(e) =>
                    setPeriodFilter(e.target.value as PeriodFilter)
                  }
                  className="mm-admin-filter-input appearance-none pr-9"
                >
                  <option value="all">Toutes les périodes</option>
                  <option value="30">30 derniers jours</option>
                  <option value="90">90 derniers jours</option>
                  <option value="365">12 derniers mois</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={exportCsv}
            disabled={exporting || filtered.length === 0}
            className="mm-admin-filter-export w-full shrink-0 xl:ml-auto xl:w-auto"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4 stroke-[1.75]" />
            )}
            {exporting ? "Export..." : "Exporter"}
          </button>
        </div>
      </section>

      <section className="mm-card overflow-hidden">
        <div className="border-b border-border/50 px-5 py-4 sm:px-6">
          <h2 className="text-lg font-bold text-primary">Liste des matchs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length.toLocaleString("fr-FR")} match
            {filtered.length > 1 ? "s" : ""}
            {filtered.length !== matches.length &&
              ` sur ${matches.length.toLocaleString("fr-FR")}`}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-semibold text-primary">Aucun match</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Les mises en relation proposées apparaîtront ici.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto px-1 pb-1 sm:px-2">
              <table className="mm-admin-data-table">
                <thead>
                  <tr>
                    <th className="min-w-[280px]">Couple</th>
                    <th className="min-w-[150px]">Statut</th>
                    <th className="min-w-[170px]">Proposé le</th>
                    <th className="min-w-[240px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((match) => (
                    <tr key={match.id} className="group">
                      <td>
                        <CoupleCell match={match} />
                      </td>
                      <td>
                        <StatusBadge
                          kind="match"
                          status={match.status}
                          className="px-3 py-1 text-xs"
                        />
                      </td>
                      <td className="whitespace-nowrap text-[15px] text-muted-foreground">
                        {formatMatchDate(match.proposedAt)}
                      </td>
                      <td>
                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                          {match.chatId && (
                            <Link
                              href={`/admin/conversations/${match.chatId}`}
                              className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e8e0f0] bg-white px-4 text-sm font-semibold text-[#5b3d8f] transition-colors hover:bg-[#f8f6fc]"
                            >
                              <MessageCircle className="h-4 w-4" />
                              Discussion
                            </Link>
                          )}
                          {match.status === "active" && (
                            <>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => updateStatus(match.id, "success")}
                                className="inline-flex h-10 items-center rounded-xl bg-[#dcfce7] px-4 text-sm font-semibold text-[#15803d] transition-colors hover:bg-[#bbf7d0] disabled:opacity-60"
                              >
                                Réussi
                              </button>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => updateStatus(match.id, "failed")}
                                className="inline-flex h-10 items-center rounded-xl bg-[#fce7f3] px-4 text-sm font-semibold text-[#be185d] transition-colors hover:bg-[#fbcfe8] disabled:opacity-60"
                              >
                                Échoué
                              </button>
                            </>
                          )}
                          {(match.status === "pending_payment" ||
                            match.status === "pending") && (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => updateStatus(match.id, "cancelled")}
                              className="inline-flex h-10 items-center rounded-xl border border-border/60 bg-white px-4 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/40 disabled:opacity-60"
                            >
                              Annuler
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          </>
        )}
      </section>
    </div>
  );
}
