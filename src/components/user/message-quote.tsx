"use client";

import { cn } from "@/lib/utils";

interface MessageQuoteProps {
  senderName: string;
  content: string;
  isMine: boolean;
  onClick?: () => void;
}

export function MessageQuote({
  senderName,
  content,
  isMine,
  onClick,
}: MessageQuoteProps) {
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "mb-2 w-full rounded-lg border-l-[3px] px-2.5 py-1.5 text-left text-xs",
        isMine
          ? "border-white/70 bg-white/15 text-white/95"
          : "border-[#e91e8c] bg-[#faf8fc] text-[#6b5f7a]",
        onClick && "cursor-pointer transition-opacity hover:opacity-80"
      )}
    >
      <p
        className={cn(
          "truncate font-semibold",
          isMine ? "text-white" : "text-[#e91e8c]"
        )}
      >
        {senderName}
      </p>
      <p className="mt-0.5 line-clamp-2 leading-snug">{content}</p>
    </Tag>
  );
}
