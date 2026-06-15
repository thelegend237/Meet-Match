import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileCompletionBar } from "@/components/ui/progress";
import type { Profile } from "@/lib/types/database";

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

export function PaymentRequiredBanner({ profile }: { profile: Profile }) {
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
            <p className="font-medium text-primary">Activez votre compte</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Réglez les frais d&apos;inscription pour découvrir les profils.
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
