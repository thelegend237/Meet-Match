import {
  GENDER_LABELS,
  RELATIONSHIP_LABELS,
} from "@/lib/validations/profile";
import { formatProfileLanguages } from "@/lib/languages";
import type { DiscoveryProfile } from "@/lib/types/database";
import { cn } from "@/lib/utils";

function DetailBlock({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#e8e0f0]/60",
        className
      )}
    >
      <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9b8fa8]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[#2e1a47]">{children}</p>
    </section>
  );
}

export function ProfileDetailMeta({
  profile,
  variant = "light",
  className,
}: {
  profile: DiscoveryProfile;
  variant?: "light" | "dark";
  className?: string;
}) {
  const languages = formatProfileLanguages(profile);
  const genderLabel = profile.gender ? GENDER_LABELS[profile.gender] : null;
  const relationshipLabel = profile.relationship_type
    ? RELATIONSHIP_LABELS[profile.relationship_type]
    : null;

  const chips = [genderLabel, languages, relationshipLabel].filter(Boolean);
  if (chips.length === 0) return null;

  const isDark = variant === "dark";

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {chips.map((chip) => (
        <span
          key={chip}
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
            isDark
              ? "border border-white/25 bg-white/15 text-white backdrop-blur-sm"
              : "border border-[#e8e0f0] bg-white text-[#5b3d8f] shadow-sm"
          )}
        >
          {chip}
        </span>
      ))}
    </div>
  );
}

export function ProfileDetailBody({
  profile,
  liked,
}: {
  profile: DiscoveryProfile;
  liked?: boolean;
}) {
  const hasBio = Boolean(profile.bio?.trim());
  const hasExpectations = Boolean(profile.expectations?.trim());

  if (!hasBio && !hasExpectations && !liked) {
    return (
      <p className="rounded-2xl bg-white/80 px-4 py-3 text-center text-sm text-[#9b8fa8] ring-1 ring-[#e8e0f0]/60">
        Ce membre n&apos;a pas encore complété sa présentation.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {hasBio && <DetailBlock title="À propos">{profile.bio}</DetailBlock>}

      {hasExpectations && (
        <DetailBlock title="Ce qu'il/elle recherche">
          {profile.expectations}
        </DetailBlock>
      )}

      {liked && (
        <p className="rounded-2xl bg-[#fce7f3]/60 px-4 py-3 text-center text-sm font-semibold text-[#be185d]">
          Votre intérêt a déjà été enregistré pour ce profil.
        </p>
      )}
    </div>
  );
}
