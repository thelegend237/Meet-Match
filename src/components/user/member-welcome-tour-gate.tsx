"use client";

import { Suspense } from "react";
import { MemberWelcomeTour } from "@/components/user/member-welcome-tour";

export function MemberWelcomeTourGate({ eligible }: { eligible: boolean }) {
  if (!eligible) return null;

  return (
    <Suspense fallback={null}>
      <MemberWelcomeTour eligible={eligible} />
    </Suspense>
  );
}
