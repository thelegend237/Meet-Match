"use client";

import { X } from "lucide-react";

export interface ReplyTarget {
  id: string;
  content: string;
  senderName: string;
}

interface MessageReplyBarProps {
  replyTo: ReplyTarget;
  onCancel: () => void;
}

export function MessageReplyBar({ replyTo, onCancel }: MessageReplyBarProps) {
  return (
    <div className="flex items-stretch gap-2 border-b border-[#ebe6f0]/90 bg-[#faf8fc] px-3 py-2 sm:px-4">
      <div className="min-w-0 flex-1 border-l-[3px] border-[#e91e8c] pl-2">
        <p className="text-xs font-semibold text-[#e91e8c]">
          Réponse à {replyTo.senderName}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-[#6b5f7a]">
          {replyTo.content}
        </p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#9b8fa8] hover:bg-[#f3eef8]"
        aria-label="Annuler la réponse"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
