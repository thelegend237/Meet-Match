"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Loader2,
  MessageCircle,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "@/components/admin/status-badge";
import { COUNTRIES } from "@/lib/validations/auth";
import type { AdminUserListItem } from "@/lib/types/database";
import { cn, getAge } from "@/lib/utils";
import { CountryFlag } from "@/components/ui/country-flag";
import { CountrySelect } from "@/components/ui/country-select";
import { roleLabel } from "@/lib/admin/roles";

interface UsersTableProps {
  users: AdminUserListItem[];
  /** Pays distincts présents en base (profils utilisateurs) */
  countryOptions: { code: string; name: string }[];
}

type StatusFilter = "all" | "active" | "inactive" | "suspended" | "deleted";
type RoleFilter = "all" | "user" | "admin" | "superadmin";
type PeriodFilter = "all" | "30" | "90" | "365";

const PAGE_SIZE = 5;

function countryName(code: string | null) {
  if (!code) return "—";
  const upper = code.trim().toUpperCase();
  return COUNTRIES.find((c) => c.code === upper)?.name ?? upper;
}

function formatCreatedAt(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function UserDisplayStatus({ user }: { user: AdminUserListItem }) {
  if (user.registration_payment_status === "unpaid") {
    return (
      <span className="mm-user-status-pending-payment">En attente de paiement</span>
    );
  }
  if (user.matches_success > 0) {
    return <span className="mm-user-status-match-success">Match réussi</span>;
  }
  if (user.matches_total > 0 && user.matches_success === 0) {
    return <span className="mm-user-status-match-failed">Match échoué</span>;
  }
  if (user.status === "active") {
    return <span className="mm-user-status-active">Actif</span>;
  }
  return <StatusBadge kind="profile" status={user.status} />;
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
        utilisateurs
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
                item === page && "mm-admin-pagination-btn-active"
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

export function UsersTable({ users, countryOptions }: UsersTableProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (
      countryFilter !== "all" &&
      !countryOptions.some((country) => country.code === countryFilter)
    ) {
      setCountryFilter("all");
    }
  }, [countryFilter, countryOptions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = Date.now();

    return users.filter((u) => {
      if (q) {
        const haystack = [u.display_name, u.email, u.city ?? "", u.country_code ?? ""]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (countryFilter !== "all" && (u.country_code ?? "") !== countryFilter)
        return false;

      if (periodFilter !== "all") {
        const days = Number(periodFilter);
        const cutoff = now - days * 24 * 60 * 60 * 1000;
        if (new Date(u.created_at).getTime() < cutoff) return false;
      }

      return true;
    });
  }, [users, query, statusFilter, roleFilter, countryFilter, periodFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, roleFilter, countryFilter, periodFilter]);

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
      "Nom",
      "Email",
      "Âge",
      "Ville",
      "Pays",
      "Rôle",
      "Statut",
      "Inscription",
      "Likes envoyés",
      "Likes reçus",
      "Matchs",
    ];
    const rows = filtered.map((u) => [
      u.display_name,
      u.email,
      getAge(u.date_of_birth)?.toString() ?? "",
      u.city ?? "",
      countryName(u.country_code),
      roleLabel(u.role),
      u.status,
      formatCreatedAt(u.created_at),
      String(u.likes_sent),
      String(u.likes_received),
      String(u.matches_total),
    ]);

    const csv = [header, ...rows]
      .map((line) =>
        line
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `admin-utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`;
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
              id="admin-user-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un utilisateur..."
              aria-label="Rechercher un utilisateur"
              className="mm-admin-filter-input pr-10"
            />
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:contents">
            <div className="min-w-0 xl:min-w-[150px] xl:flex-1">
              <label htmlFor="admin-role-filter" className="mm-admin-filter-label">
                Rôle
              </label>
              <div className="relative">
                <select
                  id="admin-role-filter"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
                  className="mm-admin-filter-input appearance-none pr-9"
                >
                  <option value="all">Tous les rôles</option>
                  <option value="user">Membres</option>
                  <option value="admin">Administrateurs</option>
                  <option value="superadmin">Super administrateurs</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="min-w-0 xl:min-w-[150px] xl:flex-1">
              <label htmlFor="admin-status-filter" className="mm-admin-filter-label">
                Statut
              </label>
              <div className="relative">
                <select
                  id="admin-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="mm-admin-filter-input appearance-none pr-9"
                >
                  <option value="all">Tous les statuts</option>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="suspended">Suspendu</option>
                  <option value="deleted">Supprimé</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="min-w-0 xl:min-w-[150px] xl:flex-1">
              <label htmlFor="admin-country-filter" className="mm-admin-filter-label">
                Pays
              </label>
              <CountrySelect
                id="admin-country-filter"
                value={countryFilter}
                onChange={setCountryFilter}
                options={countryOptions}
                triggerClassName="mm-admin-filter-input"
              />
            </div>

            <div className="min-w-0 xl:min-w-[150px] xl:flex-1">
              <label htmlFor="admin-period-filter" className="mm-admin-filter-label">
                Inscription
              </label>
              <div className="relative">
                <select
                  id="admin-period-filter"
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
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
            disabled={exporting}
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
        <div className="border-b border-border/50 px-4 py-3">
          <h2 className="text-lg font-bold text-primary">Liste des utilisateurs</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border/60 bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-semibold">Utilisateur</th>
                <th className="px-4 py-2.5 font-semibold">Âge</th>
                <th className="px-4 py-2.5 font-semibold">Pays / Ville</th>
                <th className="px-4 py-2.5 font-semibold">Rôle</th>
                <th className="px-4 py-2.5 font-semibold">Statut</th>
                <th className="px-4 py-2.5 font-semibold">Inscription</th>
                <th className="px-4 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {paginated.map((user) => {
                const age = getAge(user.date_of_birth);
                return (
                  <tr key={user.id} className="group transition-colors hover:bg-muted/15">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/utilisateurs/${user.id}`}
                        className="flex items-center gap-3"
                      >
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-transparent transition-all group-hover:ring-secondary/20">
                          {user.primary_photo_url ? (
                            <Image
                              src={user.primary_photo_url}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="44px"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs font-semibold text-primary">
                              {(user.display_name || "?")[0]}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-primary group-hover:text-secondary">
                            {user.display_name || "—"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-primary">
                      {age ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2.5">
                        <CountryFlag code={user.country_code} size={22} className="mt-0.5" />
                        <div>
                          <p className="font-medium text-primary">
                            {countryName(user.country_code)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.city ?? "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          user.role === "user"
                            ? "text-sm text-muted-foreground"
                            : "inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
                        }
                      >
                        {roleLabel(user.role)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <UserDisplayStatus user={user} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatCreatedAt(user.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/utilisateurs/${user.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                          title="Voir le profil"
                        >
                          <Eye className="h-4 w-4 stroke-[1.75]" />
                        </Link>
                        <Link
                          href={`/admin/conversations/open?user=${user.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-secondary"
                          title="Envoyer un message"
                        >
                          <MessageCircle className="h-4 w-4 stroke-[1.75]" />
                        </Link>
                        {user.role === "user" && (
                          <Link
                            href={`/admin/matchs?tab=proposer&queue=manual&user=${user.id}`}
                            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-secondary/90"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Proposer un match
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucun résultat pour les filtres actuels.
          </p>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
        />
      </section>
    </div>
  );
}
