"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { getInitials } from "@/lib/chat/format";
import { TEAM_AVATAR_URL } from "@/lib/chat/team";
import { ChatListAvatar } from "@/components/user/chat-list-avatar";
import { cn } from "@/lib/utils";
import type { ChatParticipant } from "@/components/user/chat-participants-bar";
import { ChatParticipantsPresence } from "@/components/user/chat-participants-presence";

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  backHref?: string;
  isOpen?: boolean;
  isStaffView?: boolean;
  isMatchGroup?: boolean;
  matchId?: string | null;
  chatId?: string;
  currentUserId?: string;
  participants?: ChatParticipant[];
  presenceTracker?: {
    name: string;
    photo: string | null;
    isAdmin: boolean;
  };
  headerActions?: React.ReactNode;
  className?: string;
}

export function ChatHeader({
  title,
  subtitle,
  avatarUrl,
  backHref,
  isOpen = true,
  isStaffView: _isStaffView = false,
  isMatchGroup = false,
  matchId: _matchId,
  chatId,
  currentUserId,
  participants = [],
  presenceTracker,
  headerActions,
  className,
}: ChatHeaderProps) {
  const memberParticipants = participants.filter((p) => !p.isAdmin);
  const matchAvatarUrls = memberParticipants.map((p) => p.photo);
  const matchDisplayTitle =
    isMatchGroup && memberParticipants.length >= 2
      ? memberParticipants.map((p) => p.name.trim().split(/\s+/)[0]).join(" & ")
      : isMatchGroup
        ? "Discussion de match"
        : title;

  const statusLine = !isOpen
    ? "Discussion fermée"
    : isMatchGroup && participants.length > 0
      ? `Groupe · ${participants.length} participants`
      : subtitle;

  const isTeamAvatar = avatarUrl === TEAM_AVATAR_URL;

  return (
    <div className={cn("mm-chat-thread-header shrink-0", className)}>
      <header className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        {backHref && (
          <Link
            href={backHref}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#5b3d8f] hover:bg-[#f3eef8] md:hidden"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        )}

        <div className="flex min-w-0 flex-1 items-center gap-3">
          {isMatchGroup ? (
            <ChatListAvatar
              type="match_group"
              title={matchDisplayTitle}
              avatarUrls={matchAvatarUrls}
              size="md"
              className="shrink-0"
            />
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
                <div className="flex h-full w-full items-center justify-center bg-[#f3eef8] text-sm font-semibold text-[#5b3d8f]">
                  {getInitials(title)}
                </div>
              )}
              {isOpen && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#22c55e]" />
              )}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[16px] font-semibold text-[#2e1a47] sm:text-[17px]">
              {isMatchGroup ? matchDisplayTitle : title}
            </h1>
            {statusLine && (
              <p
                className={cn(
                  "truncate text-[13px]",
                  !isOpen ? "text-[#e91e8c]" : "text-[#6b5f7a]"
                )}
              >
                {statusLine}
              </p>
            )}
          </div>
        </div>

        {headerActions && (
          <div className="flex shrink-0 items-center">{headerActions}</div>
        )}
      </header>

      {isMatchGroup && participants.length > 0 && chatId && currentUserId && (
        <ChatParticipantsPresence
          chatId={chatId}
          currentUserId={currentUserId}
          participants={participants}
          tracker={presenceTracker}
        />
      )}
    </div>
  );
}
