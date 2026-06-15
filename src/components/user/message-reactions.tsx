"use client";

import { groupMessageReactions } from "@/lib/chat/reactions";
import type { MessageReaction } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface MessageReactionsProps {
  reactions: MessageReaction[];
  currentUserId: string;
  isMine: boolean;
  onToggle: (emoji: string) => void;
}

export function MessageReactions({
  reactions,
  currentUserId,
  isMine,
  onToggle,
}: MessageReactionsProps) {
  const grouped = groupMessageReactions(reactions, currentUserId);
  if (!grouped.length) return null;

  return (
    <div
      className={cn(
        "mt-1 flex flex-wrap gap-1",
        isMine ? "justify-end" : "justify-start"
      )}
    >
      {grouped.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          onClick={() => onToggle(reaction.emoji)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition-colors",
            reaction.reactedByMe
              ? "border-[#e91e8c]/40 bg-[#fce8f3] text-[#2e1a47]"
              : "border-[#e8e0f0] bg-white text-[#2e1a47] hover:bg-[#faf8fc]"
          )}
          title={`${reaction.count} réaction${reaction.count > 1 ? "s" : ""}`}
        >
          <span className="text-sm leading-none">{reaction.emoji}</span>
          <span className="font-semibold tabular-nums">{reaction.count}</span>
        </button>
      ))}
    </div>
  );
}
