import Link from "next/link";
import {
  Bell,
  Camera,
  ChevronRight,
  CreditCard,
  Headphones,
  Heart,
  HelpCircle,
  Lock,
  Mail,
  Map,
  Pencil,
  Phone,
  Shield,
  Trash2,
} from "lucide-react";
import { ChangePasswordForm } from "@/components/user/change-password-form";
import { ReplayWelcomeTourButton } from "@/components/user/replay-welcome-tour-button";
import { SignOutButton } from "@/components/user/sign-out-button";
import { DeleteAccountButton } from "@/components/user/delete-account-button";
import { ProfileAvatarRing } from "@/components/user/profile-avatar-ring";
import { ProfileCompletionBar } from "@/components/ui/progress";
import { PROFILE_PHOTO_ANTI_FAKE_SHORT } from "@/lib/photos/copy";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types/database";
import type { LucideIcon } from "lucide-react";

function accountStatusLabel(profile: Profile) {
  if (profile.registration_payment_status === "free") return "Accès gratuit";
  if (
    profile.registration_payment_status === "paid" &&
    profile.status === "active"
  ) {
    return "Compte actif";
  }
  if (profile.registration_payment_status === "unpaid") {
    return "Inscription à activer";
  }
  if (profile.status === "suspended") return "Compte suspendu";
  if (profile.status === "pending") return "En attente de validation";
  return "Compte inactif";
}

function accountStatusTone(profile: Profile) {
  if (
    profile.registration_payment_status === "paid" ||
    profile.registration_payment_status === "free"
  ) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200/80";
  }
  if (profile.status === "suspended") {
    return "bg-rose-50 text-rose-700 ring-rose-200/80";
  }
  return "bg-amber-50 text-amber-800 ring-amber-200/80";
}

function formatMemberSince(createdAt: string | null) {
  if (!createdAt) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(new Date(createdAt));
}

function SectionHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fce7f3]/70 text-[#e91e8c]">
        <Icon className="h-5 w-5 stroke-[1.75]" />
      </div>
      <div>
        <h2 className="font-sans text-base font-bold text-[#2e1a47] sm:text-lg">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-sm text-[#6b5f7a]">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

function SettingsQuickLink({
  href,
  icon: Icon,
  title,
  description,
  highlight,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(46,26,71,0.08)] sm:p-4",
        highlight
          ? "border-[#f0c4dc]/80 bg-[#fce7f3]/25 hover:border-[#e91e8c]/40"
          : "border-[#ebe6f0]/90 bg-white hover:border-[#e91e8c]/25"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          highlight
            ? "bg-gradient-to-br from-[#7b3d8f]/15 to-[#e91e8c]/20 text-[#e91e8c]"
            : "bg-[#faf8fc] text-[#7b3d8f]"
        )}
      >
        <Icon className="h-5 w-5 stroke-[1.75]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#2e1a47]">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#6b5f7a]">
          {description}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#9b8fa8] transition-transform group-hover:translate-x-0.5 group-hover:text-[#e91e8c]" />
    </Link>
  );
}

const PROFILE_LINKS = [
  {
    href: "/profil/modifier",
    icon: Pencil,
    title: "Modifier mon profil",
    description: "Nom, bio, préférences",
  },
  {
    href: "/profil/photos",
    icon: Camera,
    title: "Mes photos",
    description: "Photo principale et galerie",
  },
  {
    href: "/notifications",
    icon: Bell,
    title: "Notifications",
    description: "Matchs, messages, activité",
  },
  {
    href: "/paiements",
    icon: CreditCard,
    title: "Paiements",
    description: "Inscription et historique",
  },
] as const;

const ACTIVITY_LINKS = [
  {
    href: "/decouvrir/likes",
    icon: Heart,
    title: "Mes likes",
    description: "Profils qui vous intéressent",
  },
  {
    href: "/contact",
    icon: Headphones,
    title: "Contacter l'équipe",
    description: "Support et signalement",
  },
] as const;

interface ProfileSettingsProps {
  profile: Profile;
  fromReset?: boolean;
  hasPhoto?: boolean;
}

export function ProfileSettings({
  profile,
  fromReset = false,
  hasPhoto = true,
}: ProfileSettingsProps) {
  const needsActivation = profile.registration_payment_status === "unpaid";
  const needsPhoto = !hasPhoto;
  const memberSince = formatMemberSince(profile.created_at);
  const completion = profile.profile_completion ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 pb-4">
      {fromReset && (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          Votre lien de réinitialisation est valide. Choisissez un nouveau mot de
          passe dans la section Sécurité ci-dessous.
        </div>
      )}

      {/* En-tête compte */}
      <section className="mm-landing-panel overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#7b3d8f] via-[#e91e8c] to-[#f9a8d4]" />
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <ProfileAvatarRing
                photoUrl={profile.primary_photo_url}
                displayName={profile.display_name ?? "Membre"}
                completion={completion}
                size={96}
              />
              <div className="min-w-0 flex-1 pt-1">
                <p className="font-sans text-xl font-bold text-[#2e1a47]">
                  {profile.display_name || "Mon compte"}
                </p>
                {memberSince ? (
                  <p className="mt-1 text-xs text-[#9b8fa8]">
                    Membre depuis {memberSince}
                  </p>
                ) : null}
                <p className="mt-2 flex items-center gap-2 text-sm text-[#6b5f7a]">
                  <Mail className="h-4 w-4 shrink-0 text-[#e91e8c]" />
                  <span className="truncate">{profile.email}</span>
                </p>
                {profile.phone ? (
                  <p className="mt-1 flex items-center gap-2 text-sm text-[#6b5f7a]">
                    <Phone className="h-4 w-4 shrink-0 text-[#e91e8c]" />
                    <span>{profile.phone}</span>
                  </p>
                ) : null}
              </div>
            </div>
            <span
              className={cn(
                "inline-flex w-fit shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1",
                accountStatusTone(profile)
              )}
            >
              {accountStatusLabel(profile)}
            </span>
          </div>

          <div className="mt-5 rounded-xl border border-[#ebe6f0]/80 bg-[#faf8fc]/80 px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[#2e1a47]">
                Profil complété à {completion}&nbsp;%
              </p>
              {completion < 100 ? (
                <Link
                  href="/onboarding"
                  className="text-xs font-semibold text-[#e91e8c] hover:underline"
                >
                  Compléter →
                </Link>
              ) : null}
            </div>
            <ProfileCompletionBar value={completion} showLabel={false} />
          </div>
        </div>
      </section>

      {/* Alertes */}
      {(needsActivation || needsPhoto) && (
        <div className="space-y-3">
          {needsActivation && (
            <div className="flex flex-col gap-3 rounded-2xl border border-[#f0c4dc]/60 bg-[#fce7f3]/35 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-[#2e1a47]">
                Activez votre inscription pour liker les profils et accéder aux
                rencontres.
              </p>
              <Link
                href="/paiements"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#7b3d8f] to-[#e91e8c] px-5 text-sm font-semibold text-white shadow-sm hover:brightness-105"
              >
                Activer mon compte
              </Link>
            </div>
          )}
          {needsPhoto && (
            <div className="flex flex-col gap-3 rounded-2xl border border-[#f0c4dc]/60 bg-gradient-to-r from-[#fce7f3]/40 to-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e91e8c]/10">
                  <Camera className="h-5 w-5 text-[#e91e8c]" />
                </div>
                <p className="text-sm leading-relaxed text-[#2e1a47]">
                  {PROFILE_PHOTO_ANTI_FAKE_SHORT}
                </p>
              </div>
              <Link
                href="/profil/photos"
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-full border border-[#e91e8c]/30 bg-white px-5 text-sm font-semibold text-[#e91e8c] hover:bg-[#fce7f3]/50"
              >
                Ajouter une photo
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Accès rapide */}
      <section>
        <SectionHeading
          icon={Pencil}
          title="Mon compte"
          description="Profil, photos et préférences"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {PROFILE_LINKS.map((action) => (
            <SettingsQuickLink
              key={action.href}
              {...action}
              highlight={action.href === "/profil/photos" && needsPhoto}
            />
          ))}
        </div>
      </section>

      {/* Sécurité */}
      <section>
        <SectionHeading
          icon={Lock}
          title="Sécurité"
          description="Mot de passe et protection du compte"
        />
        <ChangePasswordForm fromReset={fromReset} />
      </section>

      {/* Session & confidentialité */}
      <section>
        <SectionHeading
          icon={Shield}
          title="Session & confidentialité"
          description="Connexion et visibilité de vos données"
        />
        <div className="space-y-3">
          <div className="mm-card p-5 sm:p-6">
            <p className="text-sm leading-relaxed text-[#6b5f7a]">
              Vos informations ne sont visibles que par les membres actifs validés.
              Une photo authentique est requise pour limiter les faux profils.
            </p>
            <Link
              href="/fonctionnement"
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#e91e8c] hover:underline"
            >
              Comprendre le fonctionnement
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mm-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="font-semibold text-[#2e1a47]">Se déconnecter</p>
              <p className="mt-1 text-sm text-[#6b5f7a]">
                Fermez la session sur cet appareil.
              </p>
            </div>
            <SignOutButton className="sm:min-w-[180px]" />
          </div>
        </div>
      </section>

      {/* Aide & activité */}
      <section>
        <SectionHeading
          icon={HelpCircle}
          title="Aide & activité"
          description="Support et raccourcis utiles"
        />
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {ACTIVITY_LINKS.map((action) => (
              <SettingsQuickLink key={action.href} {...action} />
            ))}
          </div>
          <ReplayWelcomeTourButton />
        </div>
      </section>

      {/* Zone de danger */}
      <section className="rounded-2xl border border-destructive/20 bg-destructive/[0.03] p-5 sm:p-6">
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-sans text-base font-bold text-[#2e1a47] sm:text-lg">
              Zone de danger
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-[#6b5f7a]">
              La suppression désactive définitivement votre profil, clôture vos
              matchs en cours et vous déconnecte. Vos données restent archivées
              conformément à notre politique de confidentialité.
            </p>
          </div>
        </div>
        <DeleteAccountButton displayName={profile.display_name ?? ""} />
      </section>
    </div>
  );
}
