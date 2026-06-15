"use client";

import { useEffect, useRef } from "react";
import { EMOJI_CATEGORIES } from "@/lib/chat/emojis";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  className?: string;
}

export function EmojiPicker({ onSelect, onClose, className }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!ref.current?.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={cn(
        "z-50 w-[min(100vw-2rem,320px)] overflow-hidden rounded-2xl border border-[#e8e0f0] bg-white shadow-[0_12px_40px_rgba(46,26,71,0.15)]",
        className
      )}
    >
      <div className="max-h-64 overflow-y-auto p-3">
        {EMOJI_CATEGORIES.map((category) => (
          <div key={category.id} className="mb-3 last:mb-0">
            <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-[#9b8fa8]">
              {category.label}
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {category.emojis.map((emoji) => (
                <button
                  key={`${category.id}-${emoji}`}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-colors hover:bg-[#f3eef8]"
                  aria-label={`Insérer ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
