"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Clock,
  Heart,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Shield,
} from "lucide-react";
import {
  AdminBackLink,
  AdminKpiCard,
  AdminKpiGrid,
  AdminSectionCard,
} from "@/components/admin/admin-page";
import { grantFreeAccessAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/admin/status-badge";
import { useAdminAction } from "@/hooks/use-admin-action";
import { formatDistanceToNow } from "@/lib/utils/date";
import { getAge } from "@/lib/utils";
import { COUNTRIES } from "@/lib/validations/auth";
import {
  GENDER_LABELS,
  RELATIONSHIP_LABELS,
  SCOPE_LABELS,
  GENDER_PREFERENCE_LABELS,
} from "@/lib/validations/profile";
import { formatCurrency } from "@/lib/utils";
import { matchStatusLabels } from "@/lib/admin/labels";
import type { AdminUserDetail } from "@/lib/types/database";

const ACCESS_OPTIONS = [
  { type: "registration" as const, label: "Inscription gratuite" },
  { type: "matching" as const, label: "Matching gratuit" },
  { type: "full" as const, label: "Accès complet" },
];

function countryName(code: string | null) {
  if (!code) return "—";
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

export function AdminUserDetailView({ detail }: { detail: AdminUserDetail }) {
  const { profile, stats, photos, payments, matchHistory, recentLikesSent, recentLikesReceived } =
    detail;
  const { pending, run } = useAdminAction();
  const [pendingAccessType, setPendingAccessType] = useState<
    "registration" | "matching" | "full" | null
  >(null);
  const age = getAge(profile.date_of_birth);

  function grantAccess(type: "registration" | "matching" | "full") {
    setPendingAccessType(type);
    void run(
      () => grantFreeAccessAction(profile.id, type),
      { success: "Accès accordé." }
    );
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <AdminBackLink href="/admin/utilisateurs" label="Retour à la liste" />

      {/* En-tête profil */}
      <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
        <div className="bg-gradient-to-r from-primary/5 via-accent/30 to-secondary/5 p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-muted shadow-md ring-4 ring-white">
              {profile.primary_photo_url ? (
                <Image
                  src={profile.primary_photo_url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-2xl font-bold text-primary">
                  {(profile.display_name || "?")[0]}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl font-bold text-primary">
                  {profile.display_name}
                  {age !== null && (
                    <span className="font-normal text-muted-foreground">, {age} ans</span>
                  )}
                </h1>
                {profile.is_verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                    <Shield className="h-3 w-3" />
                    Vérifié
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {profile.email}
                </span>
                {profile.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {profile.phone}
                  </span>
                )}
                {(profile.city || profile.country_code) && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {[profile.city, countryName(profile.country_code)]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge kind="profile" status={profile.status} />
                <StatusBadge kind="payment" status={profile.registration_payment_status} />
                {profile.gender && (
                  <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {GENDER_LABELS[profile.gender]}
                  </span>
                )}
                {profile.relationship_type && (
                  <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {RELATIONSHIP_LABELS[profile.relationship_type]}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-col">
              <Button size="sm" variant="secondary" className="rounded-full" asChild>
                <Link href={`/admin/conversations/open?user=${profile.id}`}>
                  <MessageSquare className="h-4 w-4" />
                  Envoyer un message
                </Link>
              </Button>
              {ACCESS_OPTIONS.map((opt) => (
                <Button
                  key={opt.type}
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  className="bg-white/80"
                  onClick={() => grantAccess(opt.type)}
                >
                  {pending && pendingAccessType === opt.type && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <CardContent className="grid gap-3 border-t border-border/40 bg-card p-4 sm:grid-cols-2">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4 text-secondary" />
            Inscrit le {memberSince} ({stats.member_days} jours)
          </p>
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-secondary" />
            Dernière activité :{" "}
            {profile.last_seen_at
              ? formatDistanceToNow(profile.last_seen_at)
              : "Aucune trace"}
          </p>
        </CardContent>
      </Card>

      {/* KPIs */}
      <AdminKpiGrid cols={4}>
        <AdminKpiCard
          icon="users"
          label="Matchs total"
          value={stats.matches_total}
          hint={Object.entries(stats.matches_by_status)
            .map(([s, n]) => `${n} ${matchStatusLabels[s] ?? s}`)
            .join(" · ") || "Aucun match"}
          accent="primary"
        />
        <AdminKpiCard
          icon="heart"
          label="Likes"
          value={`${stats.likes_sent} / ${stats.likes_received}`}
          hint="Envoyés / reçus"
          accent="secondary"
        />
        <AdminKpiCard
          icon="messageCircle"
          label="Messages envoyés"
          value={stats.messages_sent}
          accent="primary"
        />
        <AdminKpiCard
          icon="bell"
          label="Notifications non lues"
          value={stats.unread_notifications}
          accent="warning"
        />
      </AdminKpiGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profil & préférences */}
        <AdminSectionCard title="Profil & préférences">
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Bio</p>
              <p className="mt-1 leading-relaxed">
                {profile.bio || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Ce qu&apos;il/elle recherche
              </p>
              <p className="mt-1 leading-relaxed">
                {profile.expectations || "—"}
              </p>
            </div>
            <div className="grid gap-2 rounded-xl bg-muted/40 p-3 text-sm">
              <p>
                Genre recherché :{" "}
                <strong>
                  {GENDER_PREFERENCE_LABELS[profile.preferred_gender] ??
                    profile.preferred_gender}
                </strong>
              </p>
              <p>
                Âge :{" "}
                <strong>
                  {profile.preferred_age_min ?? "?"} – {profile.preferred_age_max ?? "?"} ans
                </strong>
              </p>
              <p>
                Portée :{" "}
                <strong>
                  {profile.preferred_relation_scope
                    ? SCOPE_LABELS[profile.preferred_relation_scope]
                    : "—"}
                </strong>
              </p>
              {(profile.preferred_city || profile.preferred_country_code) && (
                <p>
                  Lieu préféré :{" "}
                  <strong>
                    {[profile.preferred_city, countryName(profile.preferred_country_code)]
                      .filter(Boolean)
                      .join(", ")}
                  </strong>
                </p>
              )}
              <p>
                Complétion profil : <strong>{profile.profile_completion}%</strong>
              </p>
            </div>
          </div>
        </AdminSectionCard>

        <AdminSectionCard title={`Photos (${stats.photos_count})`}>
            {photos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune photo.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((url, i) => (
                  <div
                    key={url}
                    className="relative aspect-[3/4] overflow-hidden rounded-xl bg-muted"
                  >
                    <Image
                      src={url}
                      alt={`Photo ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="120px"
                    />
                  </div>
                ))}
              </div>
            )}
        </AdminSectionCard>
      </div>

      <AdminSectionCard title="Historique des matchs">
          {matchHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun match.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {matchHistory.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full bg-muted">
                      {m.partner.primary_photo_url ? (
                        <Image
                          src={m.partner.primary_photo_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs font-semibold">
                          {m.partner.display_name[0]}
                        </div>
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/admin/utilisateurs/${m.partner.id}`}
                        className="font-medium text-primary hover:text-secondary hover:underline"
                      >
                        {m.partner.display_name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        Proposé le{" "}
                        {new Date(m.proposed_at).toLocaleDateString("fr-FR")}
                        {m.closed_at &&
                          ` · Clôturé le ${new Date(m.closed_at).toLocaleDateString("fr-FR")}`}
                      </p>
                    </div>
                  </div>
                  <StatusBadge kind="match" status={m.status} />
                </li>
              ))}
            </ul>
          )}
      </AdminSectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminSectionCard title="Likes récents envoyés">
            {recentLikesSent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun like envoyé.</p>
            ) : (
              <ul className="space-y-2">
                {recentLikesSent.map((l) => (
                  <li key={l.at + l.user_id} className="flex items-center gap-2 text-sm">
                    <Heart className="h-3.5 w-3.5 text-secondary" />
                    <Link
                      href={`/admin/utilisateurs/${l.user_id}`}
                      className="font-medium hover:text-secondary hover:underline"
                    >
                      {l.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(l.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </AdminSectionCard>

        <AdminSectionCard title="Likes récents reçus">
            {recentLikesReceived.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun like reçu.</p>
            ) : (
              <ul className="space-y-2">
                {recentLikesReceived.map((l) => (
                  <li key={l.at + l.user_id} className="flex items-center gap-2 text-sm">
                    <Heart className="h-3.5 w-3.5 fill-secondary text-secondary" />
                    <Link
                      href={`/admin/utilisateurs/${l.user_id}`}
                      className="font-medium hover:text-secondary hover:underline"
                    >
                      {l.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(l.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
        </AdminSectionCard>
      </div>

      <AdminSectionCard title="Paiements">
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun paiement.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium capitalize text-primary">{p.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums">
                      {formatCurrency(Number(p.amount), p.currency)}
                    </span>
                    <StatusBadge kind="payment" status={p.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
      </AdminSectionCard>
    </div>
  );
}
