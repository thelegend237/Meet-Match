import Link from "next/link";
import { AlertCircle, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileCompletionBar } from "@/components/ui/progress";
import { isStaffProfile } from "@/lib/auth/staff";
import {
  PROFILE_PHOTO_ANTI_FAKE_SHORT,
  PROFILE_PHOTO_REQUIRED_TITLE,
} from "@/lib/photos/copy";
import type { Profile } from "@/lib/types/database";
import { PRICING_TEST_MODE } from "@/lib/pricing";

export function ProfileCompletionBanner({ profile }: { profile: Profile }) {
  if (profile.profile_completion >= 100) return null;

  return (
    <div className="mm-alert-banner border-secondary/20 bg-gradient-to-r from-accent/80 to-accent/40">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10">
            <AlertCircle className="h-5 w-5 text-secondary" />
          </div>
          <div className="space-y-2">
            <p className="font-medium text-primary">
              Complétez votre profil ({profile.profile_completion}%)
            </p>
            <ProfileCompletionBar value={profile.profile_completion} />
          </div>
        </div>
        <Button variant="secondary" size="sm" asChild className="shrink-0">
          <Link href="/onboarding">Compléter</Link>
        </Button>
      </div>
    </div>
  );
}

export function PhotoRequiredBanner() {
  return (
    <div className="mm-alert-banner border-secondary/20 bg-gradient-to-r from-accent/80 to-accent/40">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary/10">
            <Camera className="h-5 w-5 text-secondary" />
          </div>
          <div>
            <p className="font-medium text-primary">{PROFILE_PHOTO_REQUIRED_TITLE}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {PROFILE_PHOTO_ANTI_FAKE_SHORT} Sans photo, votre profil
              n&apos;apparaît pas en découverte.
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" asChild className="shrink-0">
          <Link href="/profil/photos">Ajouter une photo</Link>
        </Button>
      </div>
    </div>
  );
}

export function PaymentRequiredBanner({ profile }: { profile: Profile }) {
  if (isStaffProfile(profile)) return null;

  if (
    profile.registration_payment_status === "paid" ||
    profile.registration_payment_status === "free"
  ) {
    return null;
  }

  return (
    <div className="mm-alert-banner border-primary/15 bg-primary/[0.04]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <AlertCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-primary">
              {PRICING_TEST_MODE
                ? "Activez votre compte gratuitement"
                : "Activez votre abonnement"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {PRICING_TEST_MODE
                ? "Parcourez les profils gratuitement. Activez votre compte sans payer pour envoyer des likes — phase test en cours."
                : "Parcourez les profils gratuitement. Activez votre compte pour envoyer des likes et interagir avec les membres."}
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" asChild className="shrink-0">
          <Link href="/paiements">Activer mon compte</Link>
        </Button>
      </div>
    </div>
  );
}
