"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Info, MoreVertical, Users } from "lucide-react";
import { getInitials } from "@/lib/chat/format";
import { TEAM_AVATAR_URL } from "@/lib/chat/team";
import { cn } from "@/lib/utils";
import type { ChatParticipant } from "@/components/user/chat-participants-bar";
import { ChatParticipantsBar } from "@/components/user/chat-participants-bar";

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  backHref?: string;
  isOpen?: boolean;
  isStaffView?: boolean;
  isMatchGroup?: boolean;
  matchId?: string | null;
  participants?: ChatParticipant[];
  headerActions?: React.ReactNode;
  className?: string;
}

export function ChatHeader({
  title,
  subtitle,
  avatarUrl,
  backHref,
  isOpen = true,
  isStaffView = false,
  isMatchGroup = false,
  matchId,
  participants = [],
  headerActions,
  className,
}: ChatHeaderProps) {
  const matchDetailsHref = isStaffView
    ? "/admin/matchs"
    : matchId
      ? `/matchs?match=${matchId}`
      : "/matchs";
  const displayTitle = isMatchGroup ? "Discussion de match ❤️" : title;
  const displaySubtitle =
    isMatchGroup && participants.length > 0
      ? `Groupe · ${participants.length} participant${participants.length > 1 ? "s" : ""}`
      : subtitle;
  const isTeamAvatar = avatarUrl === TEAM_AVATAR_URL;

  return (
    <div className={cn("shrink-0 bg-white", className)}>
      <header className="flex items-center gap-3 border-b border-[#ebe6f0] px-4 py-3 sm:px-5">
        {backHref && (
          <Link
            href={backHref}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#5b3d8f] hover:bg-[#f3eef8] md:hidden"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}

        {isMatchGroup ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f3eef8] text-[#7b3d8f]">
            <Users className="h-5 w-5 stroke-[1.75]" />
          </div>
        ) : (
          <div
            className={cn(
              "relative h-10 w-10 shrink-0 overflow-hidden rounded-full",
              isTeamAvatar && "bg-gradient-to-br from-[#7b3d8f] to-[#e91e8c] p-1.5"
            )}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt=""
                fill
                className={cn(
                  isTeamAvatar
                    ? "object-contain object-center"
                    : "object-cover object-center"
                )}
                sizes="40px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-[#f3eef8] text-sm font-bold text-[#5b3d8f]">
                {getInitials(title)}
              </div>
            )}
            {isOpen && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#22c55e]" />
            )}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold text-[#2e1a47] sm:text-lg">
            {displayTitle}
          </h1>
          {displaySubtitle && (
            <p className="truncate text-xs text-[#6b5f7a] sm:text-sm">
              {displaySubtitle}
            </p>
          )}
        </div>

        <div className="flex max-w-[45%] shrink-0 flex-wrap items-center justify-end gap-1.5 sm:max-w-none sm:gap-2">
          {headerActions}
          {isMatchGroup && matchId && (
            <Link
              href={matchDetailsHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#e8e0f0] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2e1a47] transition-colors hover:bg-[#faf8fc] sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
            >
              <Info className="h-3.5 w-3.5 shrink-0 text-[#7b3d8f] sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Détails du match</span>
              <span className="sm:hidden">Détails</span>
            </Link>
          )}
          {!isOpen && (
            <span className="rounded-full bg-[#f3eef8] px-2 py-0.5 text-[10px] font-medium text-[#6b5f7a]">
              Fermé
            </span>
          )}
          {matchId && !isStaffView && (
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6b5f7a] hover:bg-[#f3eef8] sm:h-10 sm:w-10"
              aria-label="Plus d'options"
              onClick={() => {
                window.location.href = matchDetailsHref;
              }}
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          )}
        </div>
      </header>

      {isMatchGroup && participants.length > 0 && (
        <ChatParticipantsBar participants={participants} />
      )}
    </div>
  );
}
