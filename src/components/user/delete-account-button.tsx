"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteOwnAccountAction } from "@/lib/actions/account";
import { LOGIN_PATH } from "@/lib/auth/routes";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DeleteAccountButtonProps {
  displayName: string;
  className?: string;
}

export function DeleteAccountButton({
  displayName,
  className,
}: DeleteAccountButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleDelete() {
    setPending(true);
    try {
      const result = await deleteOwnAccountAction();
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Suppression impossible",
          description: result.error,
        });
        return;
      }
      router.push(`${LOGIN_PATH}?deleted=1`);
      router.refresh();
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur inattendue est survenue.",
      });
    } finally {
      setPending(false);
      setConfirmOpen(false);
    }
  }

  if (confirmOpen) {
    return (
      <div
        className={cn(
          "rounded-2xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5",
          className
        )}
      >
        <p className="text-sm font-medium text-[#2e1a47]">
          Confirmer la suppression de votre compte ?
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[#6b5f7a]">
          Le profil de{" "}
          <span className="font-semibold text-[#2e1a47]">
            {displayName || "votre compte"}
          </span>{" "}
          sera désactivé définitivement. Vos matchs en cours seront clôturés et
          vous ne pourrez plus vous connecter. Cette action est irréversible.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={pending}
            onClick={() => setConfirmOpen(false)}
          >
            Annuler
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground"
            disabled={pending}
            onClick={() => void handleDelete()}
          >
            {pending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Supprimer définitivement
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "rounded-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground",
        className
      )}
      disabled={pending}
      onClick={() => setConfirmOpen(true)}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Supprimer mon compte
    </Button>
  );
}
