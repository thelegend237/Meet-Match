"use client";

import { useRouter } from "next/navigation";
import { Map } from "lucide-react";
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
      className="w-full justify-start gap-3 rounded-2xl border-dashed py-6 text-left"
      onClick={handleReplay}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-secondary">
        <Map className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-semibold text-primary">Revoir la visite guidée</span>
        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
          Parcours de l&apos;application en 7 étapes
        </span>
      </span>
    </Button>
  );
}
