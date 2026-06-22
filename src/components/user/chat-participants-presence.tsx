"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChatPresence } from "@/hooks/use-chat-presence";
import { sortPresentParticipants } from "@/lib/chat/presence";
import {
  ChatParticipantsBar,
  type ChatParticipant,
} from "@/components/user/chat-participants-bar";
import { cn } from "@/lib/utils";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

interface PresenceActivity {
  type: "join" | "leave";
  name: string;
}

export function ChatParticipantsPresence({
  chatId,
  currentUserId,
  participants,
  tracker,
}: {
  chatId: string;
  currentUserId: string;
  participants: ChatParticipant[];
  tracker?: {
    name: string;
    photo: string | null;
    isAdmin: boolean;
  };
}) {
  const self = participants.find((p) => p.id === currentUserId);
  const metaById = useMemo(
    () => new Map(participants.map((p) => [p.id, p])),
    [participants]
  );

  const presentUsers = useChatPresence({
    chatId,
    userId: currentUserId,
    name: tracker?.name ?? self?.name ?? "Membre",
    photo: tracker?.photo ?? self?.photo ?? null,
    isAdmin: tracker?.isAdmin ?? self?.isAdmin ?? false,
    enabled: Boolean(chatId && currentUserId),
  });

  const presentParticipants = useMemo(() => {
    const mapped = presentUsers.map((user) => {
      const known = metaById.get(user.userId);
      return {
        id: user.userId,
        name: known?.name ?? user.name,
        photo: known?.photo ?? user.photo,
        isAdmin: known?.isAdmin ?? user.isAdmin,
        isSelf: user.userId === currentUserId,
      } satisfies ChatParticipant;
    });
    return sortPresentParticipants(mapped);
  }, [presentUsers, metaById, currentUserId]);

  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set());
  const [activity, setActivity] = useState<PresenceActivity | null>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const namesRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    for (const p of participants) {
      namesRef.current.set(p.id, p.name);
    }
  }, [participants]);

  useEffect(() => {
    const currentIds = new Set(presentUsers.map((u) => u.userId));
    const prev = prevIdsRef.current;
    const newlyJoined = new Set<string>();

    for (const id of currentIds) {
      if (!prev.has(id)) {
        newlyJoined.add(id);
        if (prev.size > 0 && id !== currentUserId) {
          const name =
            namesRef.current.get(id) ??
            presentUsers.find((u) => u.userId === id)?.name ??
            "Quelqu'un";
          setActivity({ type: "join", name: firstName(name) });
        }
      }
    }

    for (const id of prev) {
      if (!currentIds.has(id) && id !== currentUserId) {
        const name = namesRef.current.get(id) ?? "Quelqu'un";
        setActivity({ type: "leave", name: firstName(name) });
      }
    }

    if (newlyJoined.size > 0 && prev.size > 0) {
      setJoinedIds((current) => new Set([...current, ...newlyJoined]));
      const timer = window.setTimeout(() => {
        setJoinedIds((current) => {
          const next = new Set(current);
          for (const id of newlyJoined) next.delete(id);
          return next;
        });
      }, 4000);
      prevIdsRef.current = currentIds;
      return () => window.clearTimeout(timer);
    }

    prevIdsRef.current = currentIds;
  }, [presentUsers, currentUserId]);

  useEffect(() => {
    if (!activity) return;
    const timer = window.setTimeout(() => setActivity(null), 3200);
    return () => window.clearTimeout(timer);
  }, [activity]);

  const othersCount = presentParticipants.filter((p) => !p.isSelf).length;
  const statusLabel =
    presentParticipants.length === 0
      ? "Connexion à la discussion…"
      : presentParticipants.length === 1
        ? "Vous seul(e) dans la discussion"
        : othersCount === 0
          ? "Vous êtes en ligne"
          : `${presentParticipants.length} en ligne dans la discussion`;

  return (
    <div className="border-b border-[#ebe6f0]/70 bg-[#faf8fc]/80">
      <div className="flex items-center justify-between gap-2 px-4 py-1.5 sm:px-5">
        <p className="text-[11px] font-medium text-[#6b5f7a]">{statusLabel}</p>
        {activity && (
          <p
            className={cn(
              "mm-chat-presence-activity text-[11px] font-semibold",
              activity.type === "join"
                ? "text-[#15803d]"
                : "text-[#9b8fa8]"
            )}
            role="status"
            aria-live="polite"
          >
            {activity.type === "join"
              ? `${activity.name} a rejoint`
              : `${activity.name} est parti(e)`}
          </p>
        )}
      </div>

      {presentParticipants.length > 0 ? (
        <ChatParticipantsBar
          participants={presentParticipants}
          joinedIds={joinedIds}
        />
      ) : (
        <div className="px-4 pb-2 text-xs text-[#9b8fa8] sm:px-5">
          Synchronisation des participants…
        </div>
      )}
    </div>
  );
}
