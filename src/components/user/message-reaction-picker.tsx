"use client";

import { Plus } from "lucide-react";
import { QUICK_REACTIONS } from "@/lib/chat/emojis";
import { EmojiPicker } from "@/components/user/emoji-picker";
import { cn } from "@/lib/utils";

interface MessageReactionPickerProps {
  visible: boolean;
  isMine: boolean;
  showEmojiPicker: boolean;
  onReact: (emoji: string) => void;
  onToggleEmojiPicker: () => void;
  onCloseEmojiPicker: () => void;
}

export function MessageReactionPicker({
  visible,
  isMine,
  showEmojiPicker,
  onReact,
  onToggleEmojiPicker,
  onCloseEmojiPicker,
}: MessageReactionPickerProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        "absolute -top-11 z-20 flex items-center gap-1",
        isMine ? "right-0" : "left-0"
      )}
    >
      <div className="flex items-center gap-0.5 rounded-full border border-[#e8e0f0] bg-white px-1.5 py-1 shadow-[0_8px_24px_rgba(46,26,71,0.12)]">
        {QUICK_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onReact(emoji)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-110 hover:bg-[#f3eef8]"
            aria-label={`Réagir avec ${emoji}`}
          >
            {emoji}
          </button>
        ))}
        <div className="relative">
          <button
            type="button"
            onClick={onToggleEmojiPicker}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#7b3d8f] transition-colors hover:bg-[#f3eef8]"
            aria-label="Plus d'emojis"
          >
            <Plus className="h-4 w-4" />
          </button>
          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2">
              <EmojiPicker
                onSelect={(emoji) => {
                  onReact(emoji);
                  onCloseEmojiPicker();
                }}
                onClose={onCloseEmojiPicker}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
