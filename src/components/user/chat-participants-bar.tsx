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

export function ChatParticipantsBar({
  participants,
}: {
  participants: ChatParticipant[];
}) {
  if (participants.length === 0) return null;

  return (
    <div className="flex items-end justify-center gap-8 overflow-x-auto border-b border-[#ebe6f0] bg-[#faf8fc] px-5 py-3.5 sm:gap-10 sm:px-6">
      {participants.map((p) => (
        <div key={p.id} className="flex shrink-0 flex-col items-center gap-1">
          <div className="relative h-10 w-10 overflow-hidden rounded-full ring-2 ring-white shadow-sm sm:h-11 sm:w-11">
            {p.photo ? (
              <Image
                src={p.photo}
                alt=""
                fill
                className="object-cover"
                sizes="44px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#7b3d8f]/15 to-[#e91e8c]/15 text-xs font-bold text-[#5b3d8f]">
                {getInitials(p.name)}
              </div>
            )}
          </div>
          <span className="max-w-[120px] truncate text-center text-xs font-semibold text-[#2e1a47]">
            {p.name.length > 20 ? p.name.split(" ").slice(0, 2).join(" ") : p.name}
          </span>
          <span
            className={cn(
              "rounded px-2 py-0.5 text-[10px] font-semibold",
              p.isAdmin
                ? "bg-[#5b3d8f] text-white"
                : p.isSelf
                  ? "bg-[#e91e8c] text-white"
                  : "bg-[#ede9fe] text-[#5b3d8f]"
            )}
          >
            {p.isAdmin ? "Admin" : p.isSelf ? "Vous" : "Utilisateur"}
          </span>
        </div>
      ))}
    </div>
  );
}
