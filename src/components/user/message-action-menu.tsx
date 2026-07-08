"use client";

import { Pin, PinOff, Reply, Smile } from "lucide-react";
import { QUICK_REACTIONS } from "@/lib/chat/emojis";
import { cn } from "@/lib/utils";

interface MessageActionMenuProps {
  visible: boolean;
  isMine: boolean;
  isPinned: boolean;
  onReply: () => void;
  onTogglePin: () => void;
  onReact: () => void;
  onQuickReact: (emoji: string) => void;
  onMoreEmojis: () => void;
}

export function MessageActionMenu({
  visible,
  isMine,
  isPinned,
  onReply,
  onTogglePin,
  onReact,
  onQuickReact,
  onMoreEmojis,
}: MessageActionMenuProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "absolute top-8 z-30 w-52 overflow-hidden rounded-2xl border border-[#e8e0f0] bg-white shadow-[0_12px_32px_rgba(46,26,71,0.16)]",
        isMine ? "right-0" : "left-0"
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between gap-1 border-b border-[#f0ebf5] px-2 py-2">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onQuickReact(emoji)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-110 hover:bg-[#f3eef8]"
            aria-label={`Réagir avec ${emoji}`}
          >
            {emoji}
          </button>
        ))}
        <button
          type="button"
          onClick={onMoreEmojis}
          className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-[#7b3d8f] transition-colors hover:bg-[#f3eef8]"
          aria-label="Plus d'emojis"
          title="Plus d'emojis"
        >
          +
        </button>
      </div>

      <button
        type="button"
        onClick={onReply}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-[#2e1a47] transition-colors hover:bg-[#f7f4fb]"
      >
        <Reply className="h-[18px] w-[18px] text-[#5b3d8f]" />
        Répondre
      </button>
      <button
        type="button"
        onClick={onReact}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-[#2e1a47] transition-colors hover:bg-[#f7f4fb]"
      >
        <Smile className="h-[18px] w-[18px] text-[#5b3d8f]" />
        Réagir
      </button>
      <button
        type="button"
        onClick={onTogglePin}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-[#2e1a47] transition-colors hover:bg-[#f7f4fb]"
      >
        {isPinned ? (
          <PinOff className="h-[18px] w-[18px] text-[#e91e8c]" />
        ) : (
          <Pin className="h-[18px] w-[18px] text-[#5b3d8f]" />
        )}
        {isPinned ? "Désépingler" : "Épingler"}
      </button>
    </div>
  );
}
