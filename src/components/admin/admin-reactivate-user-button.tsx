"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { reactivateUserAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { useAdminAction } from "@/hooks/use-admin-action";

export function AdminReactivateUserButton({
  userId,
  userName,
}: {
  userId: string;
  userName: string;
}) {
  const { pending, run } = useAdminAction();

  function handleReactivate() {
    void run(() => reactivateUserAction(userId), {
      success: `Compte de ${userName} réactivé.`,
    });
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      className="min-h-11 w-full rounded-full sm:min-h-9 sm:w-auto"
      disabled={pending}
      onClick={handleReactivate}
    >
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <RotateCcw className="mr-2 h-4 w-4" />
      )}
      Réactiver le compte
    </Button>
  );
}
