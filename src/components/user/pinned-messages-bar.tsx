"use client";

import { Pin, X } from "lucide-react";
import type { ChatMessage } from "@/lib/types/database";

interface PinnedMessagesBarProps {
  pinnedMessages: ChatMessage[];
  senderNameById: Record<string, string>;
  onScrollTo: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}

export function PinnedMessagesBar({
  pinnedMessages,
  senderNameById,
  onScrollTo,
  onUnpin,
}: PinnedMessagesBarProps) {
  if (!pinnedMessages.length) return null;

  return (
    <div className="sticky top-0 z-10 space-y-1 border-b border-[#ebe6f0]/80 bg-[#fffdf8]/95 px-3 py-2 backdrop-blur-sm sm:px-5">
      {pinnedMessages.map((message) => {
        const senderName = message.sender_id
          ? senderNameById[message.sender_id] ?? "Membre"
          : "Équipe";

        return (
          <div
            key={message.id}
            className="flex items-center gap-2 rounded-xl border border-[#f5e6c8]/90 bg-[#fff9ed] px-3 py-2"
          >
            <Pin className="h-4 w-4 shrink-0 text-[#e91e8c]" />
            <button
              type="button"
              onClick={() => onScrollTo(message.id)}
              className="min-w-0 flex-1 text-left"
            >
              <p className="truncate text-xs font-semibold text-[#2e1a47]">
                {senderName}
              </p>
              <p className="truncate text-xs text-[#6b5f7a]">{message.content}</p>
            </button>
            <button
              type="button"
              onClick={() => onUnpin(message.id)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#9b8fa8] hover:bg-white/80"
              aria-label="Désépingler"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
