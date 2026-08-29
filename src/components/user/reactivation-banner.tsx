"use client";

import Link from "next/link";
import { HeartHandshake, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { requestReactivationAction } from "@/lib/actions/account";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ReactivationBannerProps {
  className?: string;
}

export function ReactivationBanner({ className }: ReactivationBannerProps) {
  const [pending, setPending] = useState(false);
  const [requested, setRequested] = useState(false);

  async function handleRequest() {
    setPending(true);
    try {
      const result = await requestReactivationAction();
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Demande impossible",
          description: result.error,
        });
        return;
      }
      setRequested(true);
      toast({
        title: "Demande enregistrée",
        description:
          "L'équipe a été prévenue. Vous pouvez aussi nous écrire via le formulaire contact.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-violet-200/90 bg-gradient-to-r from-violet-50 via-white to-fuchsia-50/80 px-4 py-4 sm:px-5 sm:py-5",
        className
      )}
      role="status"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-800">
          <HeartHandshake className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-violet-950 sm:text-base">
            Votre compte est en pause après une mise en relation réussie
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-violet-900/85">
            Félicitations pour cette étape. Tant que votre relation se poursuit,
            vous n&apos;apparaissez plus dans les propositions de match. Si les
            choses ne se sont pas passées comme prévu, vous pouvez demander la
            réactivation de votre compte — l&apos;équipe examinera votre demande.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="rounded-full"
              disabled={pending || requested}
              onClick={() => void handleRequest()}
            >
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {requested ? "Demande envoyée" : "Demander la réactivation"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-violet-200 bg-white/80"
              asChild
            >
              <Link href="/contact?subject=reactivation">
                Contacter l&apos;admin
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
