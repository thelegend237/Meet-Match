"use client";

import { Trash2, XCircle } from "lucide-react";
import {
  hardDeleteMatchAction,
  softDeleteMatchAction,
  updateMatchStatusAction,
} from "@/lib/actions/admin";
import { useAdminAction } from "@/hooks/use-admin-action";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

interface AdminMatchActionsProps {
  matchId: string;
  status: string;
  actorRole: "admin" | "superadmin";
  isDeleted?: boolean;
  layout?: "stack" | "inline";
  className?: string;
}

function canCancel(status: string) {
  return status === "pending" || status === "pending_payment" || status === "active";
}

export function AdminMatchActions({
  matchId,
  status,
  actorRole,
  isDeleted = false,
  layout = "stack",
  className,
}: AdminMatchActionsProps) {
  const { pending, run } = useAdminAction();
  const { confirm, dialog } = useConfirm();
  const isSuperadmin = actorRole === "superadmin";

  async function cancelMatch() {
    const confirmed = await confirm({
      title:
        status === "active"
          ? "Annuler ce match actif ?"
          : "Annuler cette proposition ?",
      description:
        status === "active"
          ? "La discussion sera fermée et les membres ne verront plus cette mise en relation."
          : undefined,
      confirmLabel: "Annuler le match",
      destructive: true,
    });
    if (!confirmed) return;

    void run(() => updateMatchStatusAction(matchId, "cancelled"), {
      success: "Match annulé.",
    });
  }

  async function softDelete() {
    const confirmed = await confirm({
      title: "Masquer ce match ?",
      description:
        "Il disparaîtra des listes membres et administrateurs. Seul un super administrateur pourra le supprimer définitivement de la base.",
      confirmLabel: "Masquer",
      destructive: true,
    });
    if (!confirmed) return;

    void run(() => softDeleteMatchAction(matchId), {
      success: "Match masqué.",
    });
  }

  async function hardDelete() {
    const confirmed = await confirm({
      title: "Supprimer définitivement ce match ?",
      description:
        "L'enregistrement sera effacé de la base de données. Cette action est irréversible.",
      confirmLabel: "Supprimer",
      destructive: true,
    });
    if (!confirmed) return;

    void run(() => hardDeleteMatchAction(matchId), {
      success: "Match supprimé définitivement.",
    });
  }

  const containerClass =
    layout === "inline"
      ? "flex flex-wrap items-center gap-2.5 sm:gap-3"
      : "grid grid-cols-1 gap-2";

  return (
    <>
      {dialog}
    <div className={cn(containerClass, className)}>
      {!isDeleted && canCancel(status) && (
        <button
          type="button"
          disabled={pending}
          onClick={cancelMatch}
          className={cn(
            "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border/60 bg-white text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted/40 disabled:opacity-60",
            layout === "inline" ? "px-4" : "min-h-11 w-full"
          )}
        >
          <XCircle className="h-4 w-4 shrink-0" />
          Annuler
        </button>
      )}

      {!isDeleted && (
        <button
          type="button"
          disabled={pending}
          onClick={softDelete}
          className={cn(
            "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#fecaca] bg-[#fef2f2] text-sm font-semibold text-[#b91c1c] transition-colors hover:bg-[#fee2e2] disabled:opacity-60",
            layout === "inline" ? "px-4" : "min-h-11 w-full"
          )}
        >
          <Trash2 className="h-4 w-4 shrink-0" />
          Masquer
        </button>
      )}

      {isSuperadmin && (
        <button
          type="button"
          disabled={pending}
          onClick={hardDelete}
          className={cn(
            "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#991b1b]/30 bg-[#450a0a] text-sm font-semibold text-white transition-colors hover:bg-[#7f1d1d] disabled:opacity-60",
            layout === "inline" ? "px-4" : "min-h-11 w-full"
          )}
        >
          <Trash2 className="h-4 w-4 shrink-0" />
          {isDeleted ? "Effacer définitivement" : "Supprimer définitivement"}
        </button>
      )}
    </div>
    </>
  );
}
