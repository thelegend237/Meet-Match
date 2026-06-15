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

interface PageProps {
  searchParams: Promise<{ step?: string }>;
}

export default async function InscriptionPage({ searchParams }: PageProps) {
  const { step } = await searchParams;

  return (
    <Suspense fallback={<InscriptionFallback />}>
      <OnboardingWizard mode="public" initialStepParam={step ?? null} />
    </Suspense>
  );
}
