import { Suspense } from "react";
import { OnboardingWizard } from "@/components/public/onboarding-wizard";
import { Loader2 } from "lucide-react";

function InscriptionFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-secondary" />
    </div>
  );
}

export default function InscriptionPage() {
  return (
    <Suspense fallback={<InscriptionFallback />}>
      <OnboardingWizard mode="public" />
    </Suspense>
  );
}
