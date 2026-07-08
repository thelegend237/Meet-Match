"use client";

import { Pin, Reply, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageActionMenuProps {
  visible: boolean;
  isMine: boolean;
  isPinned: boolean;
  onReply: () => void;
  onTogglePin: () => void;
  onReact: () => void;
}

export function MessageActionMenu({
  visible,
  isMine,
  isPinned,
  onReply,
  onTogglePin,
  onReact,
}: MessageActionMenuProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "absolute top-1/2 z-20 flex -translate-y-1/2 items-center gap-0.5 rounded-full border border-[#e8e0f0] bg-white px-1 py-0.5 shadow-[0_8px_24px_rgba(46,26,71,0.12)]",
        isMine ? "-left-2 -translate-x-full" : "-right-2 translate-x-full"
      )}
    >
      <button
        type="button"
        onClick={onReply}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#5b3d8f] hover:bg-[#f3eef8]"
        aria-label="Répondre"
        title="Répondre"
      >
        <Reply className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onReact}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#5b3d8f] hover:bg-[#f3eef8]"
        aria-label="Réagir"
        title="Réagir"
      >
        <Smile className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onTogglePin}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#f3eef8]",
          isPinned ? "text-[#e91e8c]" : "text-[#5b3d8f]"
        )}
        aria-label={isPinned ? "Désépingler" : "Épingler"}
        title={isPinned ? "Désépingler" : "Épingler"}
      >
        <Pin className="h-4 w-4" />
      </button>
    </div>
  );
}
