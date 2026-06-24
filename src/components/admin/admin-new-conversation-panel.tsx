"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import {
  listMembersForNewChatAction,
  type MemberChatSearchResult,
} from "@/lib/actions/chats";
import { getInitials } from "@/lib/chat/format";
import { cn } from "@/lib/utils";

interface AdminNewConversationPanelProps {
  onClose: () => void;
  className?: string;
}

function memberLabel(member: MemberChatSearchResult) {
  return member.display_name?.trim() || member.email;
}

function memberSubtitle(member: MemberChatSearchResult) {
  const parts = [member.city, member.email].filter(Boolean);
  return parts.join(" · ");
}

export function AdminNewConversationPanel({
  onClose,
  className,
}: AdminNewConversationPanelProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<MemberChatSearchResult[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await listMembersForNewChatAction();
      if (result.error) {
        setLoadError(result.error);
        setMembers([]);
        return;
      }
      setLoadError(null);
      setMembers(result.members);
    });
  }, []);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((member) => {
      const haystack = [
        member.display_name,
        member.email,
        member.city ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [members, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, MemberChatSearchResult[]>();
    for (const member of filtered) {
      const label = memberLabel(member);
      const letter = (label[0] ?? "#").toUpperCase();
      const key = /[A-ZÀ-ÖØ-Ý]/.test(letter) ? letter : "#";
      const list = map.get(key) ?? [];
      list.push(member);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"));
  }, [filtered]);

  function startWithMember(userId: string) {
    onClose();
    router.push(`/admin/conversations/open?user=${userId}`);
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col bg-[#f8f6fc]",
        className
      )}
    >
      <header className="flex shrink-0 items-center gap-3 border-b border-[#ebe6f0] bg-white px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#5b3d8f] transition-colors hover:bg-[#f3eef8]"
          aria-label="Retour aux conversations"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="font-sans text-lg font-bold text-[#2e1a47]">
          Nouvelle discussion
        </h2>
      </header>

      <div className="shrink-0 border-b border-[#ebe6f0] bg-[#f8f6fc] px-3 py-3 sm:px-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8fa8]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un nom ou un e-mail"
            aria-label="Rechercher un membre"
            className="mm-chat-list-search w-full"
            autoFocus
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-white">
        {pending && members.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[#6b5f7a]">
            <Loader2 className="h-4 w-4 animate-spin text-[#7b3d8f]" />
            Chargement des membres…
          </div>
        )}

        {loadError && (
          <p className="px-4 py-12 text-center text-sm text-destructive">
            {loadError}
          </p>
        )}

        {!pending && !loadError && filtered.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-[#6b5f7a]">
            {query.trim()
              ? "Aucun membre ne correspond à votre recherche."
              : "Aucun membre inscrit pour le moment."}
          </p>
        )}

        {!loadError && filtered.length > 0 && (
          <div className="pb-4">
            <p className="sticky top-0 z-[1] bg-[#faf8fc] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#6b5f7a]">
              Membres du site · {filtered.length}
            </p>

            {grouped.map(([letter, group]) => (
              <section key={letter}>
                <p className="bg-[#f8f6fc] px-4 py-1.5 text-xs font-bold text-[#9b8fa8]">
                  {letter}
                </p>
                <ul>
                  {group.map((member) => (
                    <li key={member.id}>
                      <button
                        type="button"
                        onClick={() => startWithMember(member.id)}
                        className="flex w-full items-center gap-3 border-b border-[#ebe6f0]/60 px-4 py-3 text-left transition-colors hover:bg-[#faf8fc]"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-[#f3eef8]">
                          {member.primary_photo_url ? (
                            <Image
                              src={member.primary_photo_url}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="48px"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[#5b3d8f]">
                              {getInitials(memberLabel(member))}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-[#2e1a47]">
                            {memberLabel(member)}
                          </p>
                          <p className="truncate text-sm text-[#6b5f7a]">
                            {memberSubtitle(member)}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
