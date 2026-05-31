"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Heart, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminSearchInput } from "@/components/admin/admin-search-input";
import {
  AdminEmptyState,
  AdminTableBody,
  AdminTableHead,
  AdminTableRow,
  AdminTableShell,
  AdminTableTd,
  AdminTableTh,
} from "@/components/admin/admin-page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatDistanceToNow } from "@/lib/utils/date";
import { COUNTRIES } from "@/lib/validations/auth";
import type { AdminUserListItem } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface UsersTableProps {
  users: AdminUserListItem[];
}

function countryName(code: string | null) {
  if (!code) return null;
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

export function UsersTable({ users }: UsersTableProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.display_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.city?.toLowerCase().includes(q) ?? false)
    );
  }, [users, query]);

  if (users.length === 0) {
    return (
      <AdminEmptyState icon="users" message="Aucun utilisateur trouvé." />
    );
  }

  return (
    <div className="space-y-4">
      <AdminSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Rechercher par nom, email, ville…"
      />

      <AdminTableShell minWidth="900px">
        <AdminTableHead>
          <AdminTableTh>Membre</AdminTableTh>
          <AdminTableTh>Statut</AdminTableTh>
          <AdminTableTh>Activité</AdminTableTh>
          <AdminTableTh>Matchs</AdminTableTh>
          <AdminTableTh>Likes</AdminTableTh>
          <AdminTableTh>Profil</AdminTableTh>
          <AdminTableTh>Inscription</AdminTableTh>
          <AdminTableTh />
        </AdminTableHead>
        <AdminTableBody>
          {filtered.map((user) => (
            <AdminTableRow key={user.id} className="group">
              <AdminTableTd>
                <Link
                  href={`/admin/utilisateurs/${user.id}`}
                  className="flex items-center gap-3"
                >
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-transparent group-hover:ring-secondary/30">
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
                    {user.is_verified && (
                      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-green-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-primary group-hover:text-secondary">
                      {user.display_name || "—"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                    {(user.city || user.country_code) && (
                      <p className="truncate text-[11px] text-muted-foreground/80">
                        {[user.city, countryName(user.country_code)]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                </Link>
              </AdminTableTd>
              <AdminTableTd>
                <StatusBadge kind="profile" status={user.status} />
              </AdminTableTd>
              <AdminTableTd>
                <p className="text-xs text-muted-foreground">
                  {user.member_days}j membre
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.last_seen_at
                    ? formatDistanceToNow(user.last_seen_at)
                    : "Jamais vu"}
                </p>
              </AdminTableTd>
              <AdminTableTd>
                <div className="flex items-center gap-1 text-sm">
                  <Users className="h-3.5 w-3.5 text-secondary" />
                  <span className="font-medium">{user.matches_total}</span>
                  {user.matches_success > 0 && (
                    <span className="text-xs text-green-600">
                      ({user.matches_success} réussis)
                    </span>
                  )}
                </div>
              </AdminTableTd>
              <AdminTableTd>
                <div className="flex items-center gap-1 text-sm">
                  <Heart className="h-3.5 w-3.5 text-secondary" />
                  <span>
                    {user.likes_sent}
                    <span className="text-muted-foreground"> / </span>
                    {user.likes_received}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  envoyés / reçus
                </p>
              </AdminTableTd>
              <AdminTableTd>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-secondary"
                      style={{ width: `${user.profile_completion}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums">
                    {user.profile_completion}%
                  </span>
                </div>
              </AdminTableTd>
              <AdminTableTd>
                <StatusBadge
                  kind="payment"
                  status={user.registration_payment_status}
                />
              </AdminTableTd>
              <AdminTableTd>
                <Link
                  href={`/admin/utilisateurs/${user.id}`}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium",
                    "bg-primary/5 text-primary transition-colors group-hover:bg-secondary group-hover:text-white"
                  )}
                >
                  Voir
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </AdminTableTd>
            </AdminTableRow>
          ))}
        </AdminTableBody>
      </AdminTableShell>

      {filtered.length === 0 && query && (
        <p className="text-center text-sm text-muted-foreground">
          Aucun résultat pour « {query} »
        </p>
      )}
    </div>
  );
}
