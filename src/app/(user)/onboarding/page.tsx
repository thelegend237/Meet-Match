import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { OnboardingWizard } from "@/components/public/onboarding-wizard";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Compléter mon profil",
};

function OnboardingFallback() {
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-secondary" />
    </div>
  );
}

export default async function OnboardingPage() {
  const profile = await requireUser();

  return (
    <div className="mx-auto w-full max-w-lg -mt-2">
      <Suspense fallback={<OnboardingFallback />}>
        <OnboardingWizard mode="continue" initialProfile={profile} />
      </Suspense>
    </div>
  );
}
