"use client";

import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { deleteUserProfileAction } from "@/lib/actions/admin";
import { useAdminAction } from "@/hooks/use-admin-action";
import { Button } from "@/components/ui/button";
import { AdminSectionCard } from "@/components/admin/admin-page";

interface AdminDeleteUserButtonProps {
  userId: string;
  userName: string;
  actorId: string;
  actorRole: "user" | "admin" | "superadmin";
}

export function AdminDeleteUserButton({
  userId,
  userName,
  actorId,
  actorRole,
}: AdminDeleteUserButtonProps) {
  const router = useRouter();
  const { pending, run } = useAdminAction();
  const isSelf = userId === actorId;
  const canDelete = actorRole === "superadmin" && !isSelf;

  if (!canDelete) return null;

  async function handleDelete() {
    const confirmed = window.confirm(
      `Supprimer définitivement le profil de ${userName} ?\n\n` +
        "Le compte sera désactivé, ses matchs actifs clôturés et ses conversations fermées. " +
        "Cette action est irréversible."
    );
    if (!confirmed) return;

    await run(
      () => deleteUserProfileAction(userId),
      {
        success: "Profil supprimé.",
        onSuccess: () => router.push("/admin/utilisateurs"),
      }
    );
  }

  return (
    <AdminSectionCard
      title="Zone de danger"
      description="Suppression définitive du profil membre."
      className="border-destructive/30"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Le membre ne pourra plus se connecter. Ses données restent archivées en base
          (suppression logique).
        </p>
        <Button
          type="button"
          variant="outline"
          className="rounded-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          disabled={pending}
          onClick={() => void handleDelete()}
        >
          {pending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Supprimer le profil
        </Button>
      </div>
    </AdminSectionCard>
  );
}
