"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/admin/status-badge";
import { paymentStatusLabels } from "@/lib/admin/labels";
import type { Payment, PaymentStatus, PaymentType } from "@/lib/types/database";
import { cn, formatCurrency } from "@/lib/utils";

export interface PaymentUserInfo {
  name: string;
  email: string;
  photo: string | null;
}

interface PaymentsTableProps {
  payments: Payment[];
  usersById: Record<string, PaymentUserInfo>;
}

type TypeFilter = "all" | PaymentType;
type StatusFilter = "all" | PaymentStatus;
type PeriodFilter = "all" | "30" | "90" | "365";

const PAGE_SIZE = 10;

const TYPE_LABELS: Record<PaymentType, string> = {
  registration: "Inscription",
  matching: "Matching",
};

function formatPaymentDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
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
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Affichage {start} à {end} sur {totalItems.toLocaleString("fr-FR")}{" "}
        transactions
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

export function PaymentsTable({ payments, usersById }: PaymentsTableProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();

    return payments.filter((payment) => {
      const user = usersById[payment.user_id];

      if (q) {
        const haystack = [
          user?.name ?? "",
          user?.email ?? "",
          TYPE_LABELS[payment.type],
          paymentStatusLabels[payment.status] ?? payment.status,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (typeFilter !== "all" && payment.type !== typeFilter) return false;
      if (statusFilter !== "all" && payment.status !== statusFilter)
        return false;

      if (periodFilter !== "all") {
        const days = Number(periodFilter);
        const cutoff = now - days * 24 * 60 * 60 * 1000;
        if (new Date(payment.created_at).getTime() < cutoff) return false;
      }

      return true;
    });
  }, [payments, query, typeFilter, statusFilter, periodFilter, usersById]);

  const filteredRevenue = useMemo(
    () =>
      filtered
        .filter((p) => p.status === "paid")
        .reduce((sum, p) => sum + Number(p.amount), 0),
    [filtered]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [query, typeFilter, statusFilter, periodFilter]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  function exportCsv() {
    if (exporting) return;
    setExporting(true);

    const header = [
      "Utilisateur",
      "Email",
      "Type",
      "Montant",
      "Devise",
      "Statut",
      "Fournisseur",
      "Date",
      "Match ID",
    ];

    const rows = filtered.map((payment) => {
      const user = usersById[payment.user_id];
      return [
        user?.name ?? "—",
        user?.email ?? "—",
        TYPE_LABELS[payment.type],
        String(Number(payment.amount)),
        payment.currency,
        paymentStatusLabels[payment.status] ?? payment.status,
        payment.provider,
        formatPaymentDate(payment.created_at),
        payment.match_id ?? "",
      ];
    });

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
    a.download = `paiements-meet-match-${new Date().toISOString().slice(0, 10)}.csv`;
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
              id="admin-payment-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un membre, un type..."
              aria-label="Rechercher un paiement"
              className="mm-admin-filter-input pr-10"
            />
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:contents">
            <div className="min-w-0 xl:min-w-[150px] xl:flex-1">
              <label htmlFor="admin-payment-type" className="mm-admin-filter-label">
                Type
              </label>
              <div className="relative">
                <select
                  id="admin-payment-type"
                  value={typeFilter}
                  onChange={(e) =>
                    setTypeFilter(e.target.value as TypeFilter)
                  }
                  className="mm-admin-filter-input appearance-none pr-9"
                >
                  <option value="all">Tous les types</option>
                  <option value="registration">Inscription</option>
                  <option value="matching">Matching</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="min-w-0 xl:min-w-[150px] xl:flex-1">
              <label
                htmlFor="admin-payment-status"
                className="mm-admin-filter-label"
              >
                Statut
              </label>
              <div className="relative">
                <select
                  id="admin-payment-status"
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(e.target.value as StatusFilter)
                  }
                  className="mm-admin-filter-input appearance-none pr-9"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="paid">Payé</option>
                  <option value="free">Gratuit</option>
                  <option value="unpaid">Impayé</option>
                  <option value="failed">Échoué</option>
                  <option value="refunded">Remboursé</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="min-w-0 xl:min-w-[150px] xl:flex-1">
              <label
                htmlFor="admin-payment-period"
                className="mm-admin-filter-label"
              >
                Période
              </label>
              <div className="relative">
                <select
                  id="admin-payment-period"
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
          <div>
            <h2 className="text-lg font-bold text-primary">
              Historique des transactions
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {filtered.length.toLocaleString("fr-FR")} transaction
              {filtered.length > 1 ? "s" : ""}
              {filtered.length !== payments.length &&
                ` sur ${payments.length.toLocaleString("fr-FR")}`}
              {" · "}
              Revenus filtrés :{" "}
              <span className="font-semibold text-primary">
                {formatCurrency(filteredRevenue, "CAD")}
              </span>
            </p>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="font-semibold text-primary">Aucune transaction</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Modifiez les filtres ou attendez de nouveaux paiements.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-semibold">Utilisateur</th>
                    <th className="px-4 py-2.5 font-semibold">Type</th>
                    <th className="px-4 py-2.5 font-semibold">Montant</th>
                    <th className="px-4 py-2.5 font-semibold">Statut</th>
                    <th className="px-4 py-2.5 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {paginated.map((payment) => {
                    const user = usersById[payment.user_id];
                    return (
                      <tr
                        key={payment.id}
                        className="group transition-colors hover:bg-muted/15"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/utilisateurs/${payment.user_id}`}
                            className="flex items-center gap-3"
                          >
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-transparent transition-all group-hover:ring-secondary/20">
                              {user?.photo ? (
                                <Image
                                  src={user.photo}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs font-semibold text-primary">
                                  {(user?.name || "?")[0]}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-primary group-hover:text-secondary">
                                {user?.name ?? "—"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {user?.email ?? "—"}
                              </p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-3 py-1 text-xs font-semibold",
                              payment.type === "registration"
                                ? "bg-[#ede9fe] text-[#5b3d8f]"
                                : "bg-[#fce7f3] text-[#be185d]"
                            )}
                          >
                            {TYPE_LABELS[payment.type]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-bold tabular-nums text-primary">
                            {formatCurrency(
                              Number(payment.amount),
                              payment.currency
                            )}
                          </p>
                          {payment.status === "free" && (
                            <p className="text-[11px] text-muted-foreground">
                              Accès offert
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            kind="payment"
                            status={payment.status}
                          />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatPaymentDate(payment.created_at)}
                        </td>
                      </tr>
                    );
                  })}
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
