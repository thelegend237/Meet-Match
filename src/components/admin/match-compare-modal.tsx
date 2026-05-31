"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Info,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAge } from "@/lib/utils";
import { COUNTRIES } from "@/lib/validations/auth";
import {
  GENDER_LABELS,
  RELATIONSHIP_LABELS,
  SCOPE_LABELS,
  GENDER_PREFERENCE_LABELS,
} from "@/lib/validations/profile";
import {
  computePairCompatibility,
  compatibilityScore,
  type CompatibilityPoint,
} from "@/lib/admin/compatibility";
import type { AdminCompareProfile, MutualLikePair } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface MatchCompareModalProps {
  pair: MutualLikePair | null;
  pending: boolean;
  onClose: () => void;
  onPropose: (userAId: string, userBId: string) => void;
}

function countryName(code: string | null) {
  if (!code) return "—";
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

function StatusIcon({ status }: { status: CompatibilityPoint["status"] }) {
  if (status === "match") return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === "mismatch") return <AlertTriangle className="h-4 w-4 text-amber-600" />;
  if (status === "partial") return <Info className="h-4 w-4 text-blue-600" />;
  return <Info className="h-4 w-4 text-muted-foreground" />;
}

function ProfilePanel({ profile }: { profile: AdminCompareProfile }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const age = getAge(profile.date_of_birth);
  const photos = profile.photos.length
    ? profile.photos
    : profile.primary_photo_url
      ? [profile.primary_photo_url]
      : [];

  useEffect(() => {
    setPhotoIndex(0);
  }, [profile.id]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-[4/5] max-h-[280px] w-full shrink-0 bg-muted sm:max-h-[320px]">
        {photos.length > 0 ? (
          <>
            <Image
              src={photos[photoIndex] ?? photos[0]}
              alt={profile.display_name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 40vw"
            />
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)
                  }
                  className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white"
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <span className="absolute bottom-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
                  {photoIndex + 1}/{photos.length}
                </span>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <User className="h-12 w-12 opacity-40" />
          </div>
        )}
        {profile.is_verified && (
          <Badge variant="success" className="absolute left-2 top-2">
            Vérifié
          </Badge>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <div>
          <h3 className="font-serif text-xl font-bold text-primary">
            {profile.display_name}
            {age !== null && (
              <span className="font-normal text-muted-foreground">, {age} ans</span>
            )}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {[profile.city, countryName(profile.country_code)]
              .filter(Boolean)
              .join(", ")}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.gender && (
              <Badge variant="outline">{GENDER_LABELS[profile.gender]}</Badge>
            )}
            {profile.relationship_type && (
              <Badge variant="outline">
                {RELATIONSHIP_LABELS[profile.relationship_type]}
              </Badge>
            )}
            <Badge
              variant={
                profile.registration_payment_status === "paid" ||
                profile.registration_payment_status === "free"
                  ? "success"
                  : "warning"
              }
            >
              {profile.registration_payment_status === "free"
                ? "Accès gratuit"
                : profile.registration_payment_status === "paid"
                  ? "Inscription payée"
                  : "Inscription impayée"}
            </Badge>
            <Badge variant="secondary">{profile.profile_completion}% profil</Badge>
          </div>
        </div>

        {profile.bio && (
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Bio
            </h4>
            <p className="mt-1 text-sm leading-relaxed">{profile.bio}</p>
          </section>
        )}

        {profile.expectations && (
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recherche
            </h4>
            <p className="mt-1 text-sm leading-relaxed">{profile.expectations}</p>
          </section>
        )}

        <section className="rounded-xl bg-muted/40 p-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Préférences
          </h4>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              Genre recherché :{" "}
              {profile.preferred_gender
                ? GENDER_PREFERENCE_LABELS[profile.preferred_gender]
                : "—"}
            </li>
            <li>
              Âge :{" "}
              {profile.preferred_age_min ?? "?"} – {profile.preferred_age_max ?? "?"} ans
            </li>
            <li>
              Portée :{" "}
              {profile.preferred_relation_scope
                ? SCOPE_LABELS[profile.preferred_relation_scope]
                : "—"}
            </li>
            {(profile.preferred_city || profile.preferred_country_code) && (
              <li>
                Lieu préféré :{" "}
                {[profile.preferred_city, countryName(profile.preferred_country_code)]
                  .filter(Boolean)
                  .join(", ")}
              </li>
            )}
          </ul>
        </section>

        <p className="text-xs text-muted-foreground">{profile.email}</p>
      </div>
    </div>
  );
}

export function MatchCompareModal({
  pair,
  pending,
  onClose,
  onPropose,
}: MatchCompareModalProps) {
  useEffect(() => {
    if (!pair) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [pair]);

  if (!pair) return null;

  const points = computePairCompatibility(pair.profileA, pair.profileB);
  const score = compatibilityScore(points);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Fermer"
        onClick={onClose}
      />

      <div className="relative flex max-h-[95dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-background shadow-2xl sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
          <div>
            <h2 className="font-serif text-xl font-bold text-primary sm:text-2xl">
              Comparer les profils
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Like réciproque depuis{" "}
              {new Date(pair.mutualAt).toLocaleDateString("fr-FR")} — analysez
              avant de proposer la mise en relation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary">
                Indice de compatibilité
              </span>
              <Badge
                variant={score >= 60 ? "success" : score >= 40 ? "secondary" : "warning"}
              >
                {score}%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Aide à la décision — le jugement humain reste essentiel.
            </p>
          </div>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {points.map((point, i) => (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs",
                  point.status === "match" && "bg-green-50 text-green-900",
                  point.status === "mismatch" && "bg-amber-50 text-amber-900",
                  point.status === "partial" && "bg-blue-50 text-blue-900",
                  point.status === "info" && "bg-muted/60 text-muted-foreground"
                )}
              >
                <StatusIcon status={point.status} />
                <span>{point.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
          <ProfilePanel profile={pair.profileA} />
          <ProfilePanel profile={pair.profileB} />
        </div>

        <div className="flex flex-col gap-2 border-t border-border bg-card p-4 sm:flex-row sm:justify-end sm:p-5">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Fermer
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => onPropose(pair.userAId, pair.userBId)}
          >
            <Heart className="mr-2 h-4 w-4" />
            {pending ? "Envoi..." : "Proposer le match"}
          </Button>
        </div>
      </div>
    </div>
  );
}
