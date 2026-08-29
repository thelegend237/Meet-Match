"use client";

import { ChevronDown, MessageSquareText } from "lucide-react";
import { useState } from "react";
import { ADMIN_QUICK_REPLIES } from "@/lib/admin/quick-replies";
import { cn } from "@/lib/utils";

interface AdminQuickRepliesProps {
  onSelect: (content: string) => void;
  disabled?: boolean;
}

export function AdminQuickReplies({
  onSelect,
  disabled = false,
}: AdminQuickRepliesProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(content: string) {
    onSelect(content);
    setOpen(false);
  }

  return (
    <div className="border-b border-[#ebe6f0]/90 bg-white px-3 py-2 sm:px-4">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm font-medium transition-colors",
          open
            ? "bg-[#ede9fe] text-[#5b3d8f]"
            : "text-[#6b5f7a] hover:bg-[#f3eef8] hover:text-[#5b3d8f]",
          disabled && "pointer-events-none opacity-50"
        )}
        aria-expanded={open}
      >
        <MessageSquareText className="h-4 w-4 shrink-0" />
        <span className="flex-1">Réponses rapides</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div className="mt-2 flex flex-wrap gap-2 pb-1">
          {ADMIN_QUICK_REPLIES.map((reply) => (
            <button
              key={reply.id}
              type="button"
              disabled={disabled}
              onClick={() => handleSelect(reply.content)}
              className="rounded-full border border-[#e8e0f0] bg-[#faf8fc] px-3 py-1.5 text-xs font-medium text-[#5b3d8f] transition-colors hover:border-[#c4b5d0] hover:bg-[#ede9fe] disabled:opacity-50"
              title={reply.content.slice(0, 120)}
            >
              {reply.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
