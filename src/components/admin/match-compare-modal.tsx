"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
  Sparkles,
  Mail,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
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
import type { AdminCompareProfile, MatchProposalPair } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface MatchCompareModalProps {
  pair: MatchProposalPair | null;
  pending: boolean;
  onClose: () => void;
  onPropose: (userAId: string, userBId: string) => void;
}

function countryName(code: string | null) {
  if (!code) return "—";
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

function formatSignalDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function sourceLabel(source: MatchProposalPair["source"]) {
  if (source === "mutual") return "Like réciproque";
  if (source === "one_way") return "Like à sens unique";
  return "Proposition manuelle";
}

function proposalContext(pair: MatchProposalPair): string {
  if (pair.source === "manual") {
    return "Analysez les deux profils avant de proposer cette mise en relation.";
  }
  if (pair.source === "one_way" && pair.signalAt) {
    return `${pair.userAName} a liké ${pair.userBName} le ${formatSignalDate(pair.signalAt)} — pas de like en retour pour l'instant.`;
  }
  if (pair.signalAt) {
    return `Les deux membres se sont likés le ${formatSignalDate(pair.signalAt)}.`;
  }
  return "Analysez les profils avant de proposer la mise en relation.";
}

const INSIGHT_STYLES: Record<
  CompatibilityPoint["status"],
  { wrap: string; icon: string }
> = {
  match: {
    wrap: "border-emerald-200/80 bg-emerald-50/90 text-emerald-950",
    icon: "text-emerald-600",
  },
  mismatch: {
    wrap: "border-amber-200/80 bg-amber-50/90 text-amber-950",
    icon: "text-amber-600",
  },
  partial: {
    wrap: "border-sky-200/80 bg-sky-50/90 text-sky-950",
    icon: "text-sky-600",
  },
  info: {
    wrap: "border-[#ebe6f0] bg-white/80 text-[#6b5f7a]",
    icon: "text-[#9b8fa8]",
  },
};

function StatusIcon({
  status,
  className,
}: {
  status: CompatibilityPoint["status"];
  className?: string;
}) {
  const iconClass = cn("h-4 w-4 shrink-0", INSIGHT_STYLES[status].icon, className);
  if (status === "match") return <CheckCircle2 className={iconClass} />;
  if (status === "mismatch") return <AlertTriangle className={iconClass} />;
  return <Info className={iconClass} />;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const tone =
    score >= 60 ? "#10b981" : score >= 40 ? "#e91e8c" : "#f59e0b";

  return (
    <div className="relative flex h-[104px] w-[104px] shrink-0 items-center justify-center">
      <svg className="-rotate-90" width="104" height="104" aria-hidden>
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke="#ebe6f0"
          strokeWidth="8"
        />
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke={tone}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-sans text-2xl font-bold leading-none text-[#2e1a47]">
          {score}
        </span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#9b8fa8]">
          %
        </span>
      </div>
    </div>
  );
}

function ProfilePhotoGallery({
  photos,
  name,
  photoIndex,
  onChange,
  isVerified,
  hero = false,
}: {
  photos: string[];
  name: string;
  photoIndex: number;
  onChange: (index: number) => void;
  isVerified: boolean;
  hero?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#fce7f3]/50 via-white to-[#ede9fe]/40 p-1.5">
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-[1.15rem] bg-[#f3eef8]",
          hero
            ? "aspect-[4/5] max-h-[min(42vh,360px)]"
            : "aspect-[4/5]"
        )}
      >
        {photos.length > 0 ? (
          <Image
            src={photos[photoIndex] ?? photos[0]}
            alt={name}
            fill
            className="object-contain object-center"
            sizes="(max-width: 768px) 100vw, 32vw"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-[#9b8fa8]">
            <User className="h-12 w-12 opacity-40" />
            <span className="text-xs font-medium">Aucune photo</span>
          </div>
        )}

        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                onChange((photoIndex - 1 + photos.length) % photos.length)
              }
              className="absolute left-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#2e1a47] shadow-md transition hover:bg-white"
              aria-label="Photo précédente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onChange((photoIndex + 1) % photos.length)}
              className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#2e1a47] shadow-md transition hover:bg-white"
              aria-label="Photo suivante"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {isVerified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            <CheckCircle2 className="h-3 w-3" />
            Vérifié
          </span>
        )}
      </div>

      {photos.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5 px-1">
          {photos.map((url, i) => (
            <button
              key={`${url}-${i}`}
              type="button"
              onClick={() => onChange(i)}
              className={cn(
                "relative h-10 w-10 overflow-hidden rounded-lg ring-2 transition-all",
                i === photoIndex
                  ? "ring-[#e91e8c] shadow-sm"
                  : "ring-transparent opacity-70 hover:opacity-100"
              )}
              aria-label={`Photo ${i + 1}`}
            >
              <Image
                src={url}
                alt=""
                fill
                className="object-cover object-center"
                sizes="40px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileMetaChip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "accent";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tone === "neutral" && "bg-[#f3eef8] text-[#5b3d8f]",
        tone === "success" && "bg-emerald-100 text-emerald-800",
        tone === "warning" && "bg-amber-100 text-amber-800",
        tone === "accent" && "bg-[#fce7f3] text-[#be185d]"
      )}
    >
      {children}
    </span>
  );
}

function ProfilePhotoColumn({
  profile,
  accent,
}: {
  profile: AdminCompareProfile;
  accent: "left" | "right";
}) {
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
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <p className="truncate font-sans text-base font-bold text-[#2e1a47] sm:text-lg">
            {profile.display_name}
            {age !== null && (
              <span className="font-sans text-sm font-normal text-[#9b8fa8]">
                , {age} ans
              </span>
            )}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-[#6b5f7a]">
            <MapPin className="h-3 w-3 shrink-0 text-[#e91e8c]" />
            <span className="truncate">
              {[profile.city, countryName(profile.country_code)]
                .filter(Boolean)
                .join(", ") || "—"}
            </span>
          </p>
        </div>
        <span
          className={cn(
            "h-1 w-8 shrink-0 rounded-full",
            accent === "left" ? "bg-[#e91e8c]" : "bg-[#7b3d8f]"
          )}
          aria-hidden
        />
      </div>
      <ProfilePhotoGallery
        photos={photos}
        name={profile.display_name}
        photoIndex={photoIndex}
        onChange={setPhotoIndex}
        isVerified={profile.is_verified}
        hero
      />
    </div>
  );
}

function ProfileDetails({
  profile,
  accent,
}: {
  profile: AdminCompareProfile;
  accent: "left" | "right";
}) {
  const age = getAge(profile.date_of_birth);

  const paid =
    profile.registration_payment_status === "paid" ||
    profile.registration_payment_status === "free";

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-white shadow-[0_4px_24px_rgba(46,26,71,0.06)]",
        accent === "left"
          ? "border-[#f0c4dc]/60"
          : "border-[#d4c4f0]/60"
      )}
    >
      <div
        className={cn(
          "h-1 w-full",
          accent === "left"
            ? "bg-gradient-to-r from-[#e91e8c] to-[#f9a8d4]"
            : "bg-gradient-to-r from-[#7b3d8f] to-[#c4b5fd]"
        )}
      />

      <div className="space-y-4 p-4 sm:p-5">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-sans text-lg font-bold text-[#2e1a47]">
                Détails du profil
              </h3>
              <p className="mt-0.5 text-sm text-[#6b5f7a]">
                {profile.display_name}
                {age !== null ? `, ${age} ans` : ""}
              </p>
            </div>
            <Link
              href={`/admin/utilisateurs/${profile.id}`}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#ebe6f0] bg-[#faf8fc] text-[#7b3d8f] transition hover:border-[#e91e8c]/40 hover:text-[#e91e8c]"
              title="Voir la fiche"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {profile.gender && (
              <ProfileMetaChip>{GENDER_LABELS[profile.gender]}</ProfileMetaChip>
            )}
            {profile.relationship_type && (
              <ProfileMetaChip tone="accent">
                {RELATIONSHIP_LABELS[profile.relationship_type]}
              </ProfileMetaChip>
            )}
            <ProfileMetaChip tone={paid ? "success" : "warning"}>
              {profile.registration_payment_status === "free"
                ? "Accès gratuit"
                : paid
                  ? "Inscription payée"
                  : "Inscription impayée"}
            </ProfileMetaChip>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-[#9b8fa8]">Complétion du profil</span>
              <span className="text-[#2e1a47]">{profile.profile_completion}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#f3eef8]">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  accent === "left"
                    ? "bg-gradient-to-r from-[#e91e8c] to-[#f472b6]"
                    : "bg-gradient-to-r from-[#7b3d8f] to-[#a78bfa]"
                )}
                style={{ width: `${profile.profile_completion}%` }}
              />
            </div>
          </div>
        </div>

        {profile.bio && (
          <section className="rounded-xl border border-[#ebe6f0]/80 bg-[#faf8fc] p-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#9b8fa8]">
              Bio
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-[#2e1a47]/90">
              {profile.bio}
            </p>
          </section>
        )}

        {profile.expectations && (
          <section className="rounded-xl border border-[#ebe6f0]/80 bg-[#faf8fc] p-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#9b8fa8]">
              Recherche
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-[#2e1a47]/90">
              {profile.expectations}
            </p>
          </section>
        )}

        <section className="rounded-xl bg-gradient-to-br from-[#faf8fc] to-[#f3eef8]/50 p-4 ring-1 ring-[#ebe6f0]/60">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-[#9b8fa8]">
            Préférences
          </h4>
          <ul className="mt-3 space-y-2.5 text-sm text-[#2e1a47]">
            <li className="flex justify-between gap-3">
              <span className="text-[#9b8fa8]">Genre</span>
              <span className="text-right font-medium">
                {profile.preferred_gender
                  ? GENDER_PREFERENCE_LABELS[profile.preferred_gender]
                  : "—"}
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-[#9b8fa8]">Âge</span>
              <span className="text-right font-medium">
                {profile.preferred_age_min ?? "?"} – {profile.preferred_age_max ?? "?"}{" "}
                ans
              </span>
            </li>
            <li className="flex justify-between gap-3">
              <span className="text-[#9b8fa8]">Portée</span>
              <span className="text-right font-medium">
                {profile.preferred_relation_scope
                  ? SCOPE_LABELS[profile.preferred_relation_scope]
                  : "—"}
              </span>
            </li>
            {(profile.preferred_city || profile.preferred_country_code) && (
              <li className="flex justify-between gap-3">
                <span className="text-[#9b8fa8]">Lieu</span>
                <span className="text-right font-medium">
                  {[
                    profile.preferred_city,
                    countryName(profile.preferred_country_code),
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </span>
              </li>
            )}
          </ul>
        </section>

        <p className="flex items-center gap-2 truncate text-xs text-[#9b8fa8]">
          <Mail className="h-3.5 w-3.5 shrink-0" />
          {profile.email}
        </p>
      </div>
    </article>
  );
}

function CompatibilitySection({
  score,
  points,
}: {
  score: number;
  points: CompatibilityPoint[];
}) {
  return (
    <section className="border-t border-[#ebe6f0]/80 bg-white px-4 py-5 sm:px-6 sm:py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
        <ScoreRing score={score} />
        <div className="min-w-0 flex-1">
          <p className="font-sans text-lg font-bold text-[#2e1a47]">
            Indice de compatibilité
          </p>
          <p className="mt-1 text-sm text-[#6b5f7a]">
            Aide à la décision — votre jugement reste essentiel.
          </p>
        </div>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {points.map((point, i) => (
          <li
            key={i}
            className={cn(
              "flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm leading-snug",
              INSIGHT_STYLES[point.status].wrap
            )}
          >
            <StatusIcon status={point.status} className="mt-0.5" />
            <span>{point.label}</span>
          </li>
        ))}
      </ul>
    </section>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 lg:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-[#2e1a47]/55 backdrop-blur-[3px]"
        aria-label="Fermer"
        onClick={onClose}
      />

      <div className="relative flex max-h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[1.75rem] bg-[#f8f6fc] shadow-[0_24px_80px_rgba(46,26,71,0.28)] sm:rounded-[1.75rem]">
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden border-b border-[#ebe6f0]/80 bg-white px-5 py-5 sm:px-6">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_0%_0%,rgba(252,231,243,0.45),transparent_55%),radial-gradient(ellipse_60%_60%_at_100%_0%,rgba(237,233,254,0.4),transparent_50%)]"
            aria-hidden
          />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fce7f3] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#be185d]">
                  <Sparkles className="h-3 w-3" />
                  {sourceLabel(pair.source)}
                </span>
              </div>
              <h2 className="mt-3 font-sans text-xl font-bold text-[#2e1a47] sm:text-2xl">
                Comparer les profils
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6b5f7a]">
                {proposalContext(pair)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-[#ebe6f0] bg-white p-2.5 text-[#6b5f7a] shadow-sm transition hover:border-[#e91e8c]/30 hover:text-[#2e1a47]"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Corps : profils en premier, compatibilité en bas */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="relative bg-[#f8f6fc] px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-5">
            <div className="relative grid gap-4 lg:grid-cols-2 lg:gap-6">
              <div className="hidden lg:pointer-events-none lg:absolute lg:left-1/2 lg:top-[min(21vh,180px)] lg:z-10 lg:flex lg:-translate-x-1/2 lg:-translate-y-1/2 lg:items-center lg:justify-center">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-[0_4px_20px_rgba(233,30,140,0.2)] ring-4 ring-[#f8f6fc]">
                  {pair.source === "one_way" ? (
                    <ArrowRight className="h-5 w-5 text-[#e91e8c]" />
                  ) : (
                    <Heart className="h-5 w-5 fill-[#fce7f3] text-[#e91e8c]" />
                  )}
                </div>
              </div>
              <ProfilePhotoColumn profile={pair.profileA} accent="left" />
              <ProfilePhotoColumn profile={pair.profileB} accent="right" />
            </div>
          </div>

          <div className="grid gap-4 border-t border-[#ebe6f0]/80 bg-white px-4 py-5 sm:grid-cols-2 sm:gap-5 sm:px-6">
            <ProfileDetails profile={pair.profileA} accent="left" />
            <ProfileDetails profile={pair.profileB} accent="right" />
          </div>

          <CompatibilitySection score={score} points={points} />
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-[#ebe6f0]/80 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#d8cfe8] bg-white px-6 text-sm font-semibold text-[#2e1a47] transition hover:bg-[#faf8fc] disabled:opacity-60"
          >
            Fermer
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onPropose(pair.userAId, pair.userBId)}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-2 rounded-full px-7 text-sm font-semibold text-white shadow-lg transition-all disabled:opacity-60",
              "bg-gradient-to-r from-[#7b3d8f] to-[#e91e8c] shadow-[#e91e8c]/25 hover:brightness-105"
            )}
          >
            <Heart className="h-4 w-4" />
            {pending ? "Envoi en cours…" : "Proposer le match"}
          </button>
        </div>
      </div>
    </div>
  );
}
