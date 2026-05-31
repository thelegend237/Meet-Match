"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { OnboardingWizard } from "@/components/public/onboarding-wizard";

interface RegisterFormProps {
  variant?: "card" | "embedded";
  showLoginLink?: boolean;
}

function RegisterFallback() {
  return (
    <div className="flex justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-secondary" />
    </div>
  );
}

/** @deprecated Utilise OnboardingWizard — conservé pour la section d'accueil. */
export function RegisterForm({ variant = "card" }: RegisterFormProps) {
  if (variant === "embedded") {
    return (
      <Suspense fallback={<RegisterFallback />}>
        <OnboardingWizard mode="public" />
      </Suspense>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <Suspense fallback={<RegisterFallback />}>
        <OnboardingWizard mode="public" />
      </Suspense>
    </div>
  );
}
