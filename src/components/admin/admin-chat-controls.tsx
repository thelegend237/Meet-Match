"use client";

import { updateChatStatusAction } from "@/lib/actions/admin";
import { useAdminAction } from "@/hooks/use-admin-action";
import { Button } from "@/components/ui/button";

interface AdminChatControlsProps {
  chatId: string;
  status: "open" | "closed";
}

export function AdminChatControls({ chatId, status }: AdminChatControlsProps) {
  const { pending, run } = useAdminAction();

  function toggleStatus() {
    const next = status === "open" ? "closed" : "open";
    void run(
      () => updateChatStatusAction(chatId, next),
      {
        success:
          next === "closed"
            ? "Discussion fermée."
            : "Discussion rouverte.",
      }
    );
  }

  return (
    <Button
      size="sm"
      variant={status === "open" ? "outline" : "secondary"}
      disabled={pending}
      onClick={toggleStatus}
    >
      {status === "open" ? "Fermer la discussion" : "Rouvrir la discussion"}
    </Button>
  );
}
