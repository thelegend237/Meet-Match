"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function AdminUsersAlert() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const message = searchParams.get("message");

  useEffect(() => {
    if (message === "conversation-error") {
      toast({
        variant: "destructive",
        title: "Conversation indisponible",
        description:
          "Impossible d'ouvrir ou de créer la discussion avec ce membre. Réessayez ou contactez le support technique.",
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("message");
      router.replace(url.pathname + url.search, { scroll: false });
    }
  }, [message, router]);

  if (message !== "conversation-error") return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        Impossible d&apos;ouvrir la conversation avec ce membre. Vérifiez que le
        compte est actif, puis réessayez.
      </p>
    </div>
  );
}
