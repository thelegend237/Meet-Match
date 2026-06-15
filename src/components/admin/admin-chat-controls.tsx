"use client";

import { updateChatStatusAction } from "@/lib/actions/admin";
import { useAdminAction } from "@/hooks/use-admin-action";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminChatControlsProps {
  chatId: string;
  status: "open" | "closed";
  className?: string;
}

export function AdminChatControls({
  chatId,
  status,
  className,
}: AdminChatControlsProps) {
  const { pending, run } = useAdminAction();

  function toggleStatus() {
    const next = status === "open" ? "closed" : "open";
    void run(() => updateChatStatusAction(chatId, next), {
      success:
        next === "closed" ? "Discussion fermée." : "Discussion rouverte.",
    });
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={toggleStatus}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[#e8e0f0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2e1a47] transition-colors hover:bg-[#faf8fc] disabled:opacity-60 sm:px-3 sm:py-2 sm:text-sm",
        className
      )}
    >
      {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {status === "open" ? "Fermer la discussion" : "Rouvrir la discussion"}
    </button>
  );
}
