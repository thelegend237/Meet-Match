"use client";

import { useRouter } from "next/navigation";
import { Map, ChevronRight } from "lucide-react";
import { resetMemberTour } from "@/lib/user/member-tour";
import { Button } from "@/components/ui/button";

export function ReplayWelcomeTourButton() {
  const router = useRouter();

  function handleReplay() {
    resetMemberTour();
    router.push("/decouvrir?welcome=1");
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto w-full justify-start gap-3 rounded-2xl border-[#ebe6f0]/90 bg-white py-4 text-left hover:border-[#e91e8c]/25 hover:bg-[#faf8fc]"
      onClick={handleReplay}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fce7f3]/70 text-[#e91e8c]">
        <Map className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#2e1a47]">
          Revoir la visite guidée
        </span>
        <span className="mt-0.5 block text-xs text-[#6b5f7a]">
          Parcours de l&apos;application en 7 étapes
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#9b8fa8]" />
    </Button>
  );
}
