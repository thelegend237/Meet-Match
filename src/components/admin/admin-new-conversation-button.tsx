"use client";

import { MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminNewConversationButtonProps {
  variant?: "icon" | "button" | "compact";
  className?: string;
  onOpen: () => void;
}

export function AdminNewConversationButton({
  variant = "icon",
  className,
  onOpen,
}: AdminNewConversationButtonProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        variant === "icon"
          ? "flex h-9 w-9 items-center justify-center rounded-xl text-[#7b3d8f] transition-colors hover:bg-[#f3eef8]"
          : variant === "compact"
            ? "inline-flex h-9 items-center gap-1.5 rounded-xl border border-[#e8e0f0] bg-white px-2.5 text-xs font-semibold text-[#5b3d8f] shadow-sm transition-colors hover:border-[#7b3d8f]/30 hover:bg-[#faf8fc] sm:px-3 sm:text-sm"
            : "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7b3d8f] to-[#e91e8c] px-5 py-2.5 text-sm font-semibold text-white shadow-md",
        className
      )}
      aria-label="Nouvelle discussion"
      title="Nouvelle discussion"
    >
      <MessageSquarePlus
        className={cn(
          variant === "icon"
            ? "h-[1.15rem] w-[1.15rem] stroke-[1.75]"
            : "h-4 w-4 shrink-0"
        )}
      />
      {variant === "button" && "Nouvelle discussion"}
      {variant === "compact" && (
        <span className="hidden sm:inline">Nouvelle</span>
      )}
    </button>
  );
}
