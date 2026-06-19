import Link from "next/link";
import {
  Bell,
  Camera,
  ChevronRight,
  CreditCard,
  Headphones,
  Heart,
  Mail,
  Pencil,
  Phone,
  Shield,
  User,
} from "lucide-react";
import { ChangePasswordForm } from "@/components/user/change-password-form";
import { ReplayWelcomeTourButton } from "@/components/user/replay-welcome-tour-button";
import { SignOutButton } from "@/components/user/sign-out-button";
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

function SettingsAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="mm-card group flex items-center gap-4 p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(46,26,71,0.1)] sm:p-5"
    >
      <div className="mm-landing-icon-pink h-11 w-11 shrink-0">
        <Icon className="h-5 w-5 stroke-[1.75]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-[#2e1a47]">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#6b5f7a] sm:text-sm">
          {description}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#9b8fa8] transition-transform group-hover:translate-x-0.5 group-hover:text-[#e91e8c]" />
    </Link>
  );
}

const QUICK_ACTIONS = [
  {
    href: "/profil/modifier",
    icon: Pencil,
    title: "Modifier mon profil",
    description: "Nom, bio, préférences de recherche",
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
    description: "Matchs, messages et activité",
  },
  {
    href: "/paiements",
    icon: CreditCard,
    title: "Paiements",
    description: "Inscription, matching et historique",
  },
  {
    href: "/decouvrir/likes",
    icon: Heart,
    title: "Mes likes envoyés",
    description: "Profils qui vous intéressent",
  },
  {
    href: "/contact",
    icon: Headphones,
    title: "Contacter l'équipe",
    description: "Support, signalement ou question",
  },
] as const;

interface ProfileSettingsProps {
  profile: Profile;
  fromReset?: boolean;
}

export function ProfileSettings({ profile, fromReset = false }: ProfileSettingsProps) {
  const needsActivation = profile.registration_payment_status === "unpaid";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {fromReset && (
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          Votre lien de réinitialisation est valide. Choisissez un nouveau mot de
          passe ci-dessous.
        </div>
      )}

      <section className="mm-landing-panel overflow-hidden">
        <div className="h-1.5 w-full bg-gradient-to-r from-[#7b3d8f] via-[#e91e8c] to-[#f9a8d4]" />
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <div className="mm-landing-icon-purple h-12 w-12 shrink-0">
              <User className="h-5 w-5 stroke-[1.75]" />
            </div>
            <div className="min-w-0">
              <p className="font-sans text-lg font-bold text-[#2e1a47]">
                {profile.display_name || "Mon compte"}
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-[#6b5f7a]">
                <Mail className="h-4 w-4 shrink-0 text-[#e91e8c]" />
                <span className="truncate">{profile.email}</span>
              </p>
              {profile.phone && (
                <p className="mt-1 flex items-center gap-2 text-sm text-[#6b5f7a]">
                  <Phone className="h-4 w-4 shrink-0 text-[#e91e8c]" />
                  <span>{profile.phone}</span>
                </p>
              )}
            </div>
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-semibold ring-1",
              accountStatusTone(profile)
            )}
          >
            {accountStatusLabel(profile)}
          </span>
        </div>
      </section>

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

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#9b8fa8]">
          Aide
        </h2>
        <ReplayWelcomeTourButton />
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#9b8fa8]">
          Raccourcis
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {QUICK_ACTIONS.map((action) => (
            <SettingsAction key={action.href} {...action} />
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#9b8fa8]">
            Sécurité & confidentialité
          </h2>

          <div className="mm-card space-y-4 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[#e91e8c]" />
              <div className="text-sm leading-relaxed text-[#6b5f7a]">
                <p>
                  Vos données ne sont visibles que par les membres actifs après
                  validation. L&apos;équipe peut suspendre un compte en cas
                  d&apos;usage inapproprié.
                </p>
                <Link
                  href="/fonctionnement"
                  className="mt-2 inline-block font-semibold text-[#e91e8c] hover:underline"
                >
                  Comprendre le fonctionnement →
                </Link>
              </div>
            </div>
          </div>

          <div className="mm-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="font-semibold text-[#2e1a47]">Fin de session</p>
              <p className="mt-1 text-sm text-[#6b5f7a]">
                Déconnectez-vous de cet appareil en toute sécurité.
              </p>
            </div>
            <SignOutButton />
          </div>
        </section>

        <ChangePasswordForm fromReset={fromReset} />
      </div>
    </div>
  );
}
