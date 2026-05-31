"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/use-toast";

type ActionResult = { error?: string; success?: boolean };

export function useAdminAction() {
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function run<T extends ActionResult>(
    action: () => Promise<T>,
    messages?: { success?: string; onSuccess?: () => void }
  ): Promise<T | { error: string }> {
    setPending(true);
    try {
      const result = await action();
      if (result.error) {
        toast({
          title: "Erreur",
          description: result.error,
          variant: "destructive",
        });
        return result;
      }
      if (messages?.success) {
        toast({ title: messages.success });
      }
      messages?.onSuccess?.();
      router.refresh();
      return result;
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue est survenue.",
        variant: "destructive",
      });
      return { error: "unexpected" };
    } finally {
      setPending(false);
    }
  }

  return { pending, run };
}
