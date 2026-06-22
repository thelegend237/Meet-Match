import Image from "next/image";
import { getInitials } from "@/lib/chat/format";
import { cn } from "@/lib/utils";

export interface ChatParticipant {
  id: string;
  name: string;
  photo: string | null;
  isAdmin: boolean;
  isSelf: boolean;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function ChatParticipantsBar({
  participants,
  joinedIds,
}: {
  participants: ChatParticipant[];
  joinedIds?: Set<string>;
}) {
  if (participants.length === 0) return null;

  return (
    <div className="mm-chat-participants-strip pb-2.5 pt-0.5">
      {participants.map((p) => {
        const justJoined = joinedIds?.has(p.id) ?? false;

        return (
          <div
            key={p.id}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border bg-white/90 py-1 pl-1 pr-2.5 shadow-sm transition-all duration-300",
              justJoined
                ? "mm-chat-presence-pill-join border-[#86efac]/80"
                : "border-[#e8e0f0]/60"
            )}
          >
            <div className="relative h-7 w-7 overflow-hidden rounded-full ring-1 ring-white">
              {p.photo ? (
                <Image
                  src={p.photo}
                  alt=""
                  fill
                  className="object-cover object-center"
                  sizes="28px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7b3d8f]/15 to-[#e91e8c]/15 text-[9px] font-bold text-[#5b3d8f]">
                  {getInitials(p.name)}
                </div>
              )}
              <span
                className={cn(
                  "absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white",
                  justJoined
                    ? "bg-[#22c55e] mm-chat-presence-dot-pulse"
                    : "bg-[#22c55e]"
                )}
                aria-hidden
              />
            </div>
            <div className="min-w-0">
              <p className="max-w-[88px] truncate text-xs font-semibold text-[#2e1a47]">
                {firstName(p.name)}
              </p>
              <span
                className={cn(
                  "text-[9px] font-bold uppercase tracking-wide",
                  p.isAdmin
                    ? "text-[#5b3d8f]"
                    : p.isSelf
                      ? "text-[#e91e8c]"
                      : "text-[#9b8fa8]"
                )}
              >
                {p.isAdmin ? "Admin" : p.isSelf ? "Vous" : "En ligne"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
