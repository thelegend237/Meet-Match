"use client";

interface TypingIndicatorProps {
  names: string[];
}

function buildLabel(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return `${names[0]} est en train d'écrire`;
  if (names.length === 2)
    return `${names[0]} et ${names[1]} sont en train d'écrire`;
  return "Plusieurs personnes écrivent";
}

export function TypingIndicator({ names }: TypingIndicatorProps) {
  if (!names.length) return null;

  return (
    <div className="flex items-center gap-2 px-1">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-[#e8e0f0] bg-white px-3 py-2 shadow-sm">
        <span className="mm-typing-dot" />
        <span className="mm-typing-dot mm-typing-dot-2" />
        <span className="mm-typing-dot mm-typing-dot-3" />
      </div>
      <span className="text-xs italic text-[#9b8fa8]">{buildLabel(names)}</span>
    </div>
  );
}
