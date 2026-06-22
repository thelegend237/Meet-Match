"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { MessageCircle, Search, SquarePen } from "lucide-react";
import { ChatListAvatar } from "@/components/user/chat-list-avatar";
import { formatChatListTime } from "@/lib/chat/format";
import { isProfileOnline } from "@/lib/discover/profile-status";
import type { ChatSummary } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface ChatsListProps {
  chats: ChatSummary[];
  getHref?: (chat: ChatSummary) => string;
  activeChatId?: string;
  variant?: "user" | "admin";
  showFooter?: boolean;
}

type FilterId = "all" | "unread" | "contact" | "match";

const FILTERS_USER: { id: FilterId; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "unread", label: "Non lues" },
  { id: "match", label: "Matchs" },
  { id: "contact", label: "Équipe" },
];

const FILTERS_ADMIN: { id: FilterId; label: string }[] = [
  { id: "all", label: "Toutes" },
  { id: "unread", label: "Non lues" },
  { id: "contact", label: "Contact" },
  { id: "match", label: "Matchs" },
];

function matchesFilter(chat: ChatSummary, filter: FilterId) {
  if (filter === "all") return true;
  if (filter === "unread") return (chat.unread_count ?? 0) > 0;
  if (filter === "contact") return chat.type === "admin_contact";
  if (filter === "match") return chat.type === "match_group";
  return true;
}

function displayTitle(chat: ChatSummary, isAdmin: boolean) {
  if (chat.type === "admin_contact" && !isAdmin) {
    return "Équipe Meet & Match";
  }
  return chat.title;
}

function previewText(chat: ChatSummary, isAdmin: boolean): string {
  const content = chat.last_message?.content ?? "Aucun message";
  if (chat.status === "closed") {
    return `Discussion fermée · ${content}`;
  }
  if (isAdmin) {
    const prefix = chat.type === "match_group" ? "Match · " : "Contact · ";
    return `${prefix}${content}`;
  }
  return content;
}

function isOnline(chat: ChatSummary) {
  if (chat.status !== "open") return false;
  const timestamps = chat.participant_last_seen_at;
  if (!timestamps?.length) return false;
  return timestamps.some((ts) => isProfileOnline(ts));
}

export function ChatsList({
  chats,
  getHref,
  activeChatId,
  variant = "user",
  showFooter,
}: ChatsListProps) {
  const isAdmin = variant === "admin";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");

  const hrefFor =
    getHref ??
    ((chat: ChatSummary) =>
      isAdmin ? `/admin/conversations/${chat.id}` : `/messages/${chat.id}`);
  const newChatHref = isAdmin ? "/admin/conversations" : "/contact";
  const emptyCtaHref = isAdmin ? "/admin/utilisateurs" : "/contact";
  const emptyCtaLabel = isAdmin ? "Voir les membres" : "Contacter l'admin";
  const footerVisible = showFooter === true;
  const allHref = isAdmin ? "/admin/conversations" : "/messages";
  const filters = isAdmin ? FILTERS_ADMIN : FILTERS_USER;

  const totalUnread = useMemo(
    () => chats.reduce((sum, c) => sum + (c.unread_count ?? 0), 0),
    [chats]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return chats.filter((chat) => {
      if (!matchesFilter(chat, filter)) return false;
      if (!q) return true;
      const haystack = [
        displayTitle(chat, isAdmin),
        chat.last_message?.content ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [chats, query, filter, isAdmin]);

  const filterCounts = useMemo(() => {
    const counts: Record<FilterId, number> = {
      all: chats.length,
      unread: chats.filter((c) => (c.unread_count ?? 0) > 0).length,
      contact: chats.filter((c) => c.type === "admin_contact").length,
      match: chats.filter((c) => c.type === "match_group").length,
    };
    return counts;
  }, [chats]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f8f6fc]">
      <div className="mm-chat-list-header">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#2e1a47]">Conversations</h2>
            {totalUnread > 0 && (
              <span className="rounded-full bg-[#e91e8c] px-2 py-0.5 text-[10px] font-bold text-white">
                {totalUnread}
              </span>
            )}
          </div>
          {!isAdmin && (
            <Link
              href={newChatHref}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#7b3d8f] transition-colors hover:bg-[#f3eef8]"
              aria-label="Nouvelle conversation"
            >
              <SquarePen className="h-[1.15rem] w-[1.15rem] stroke-[1.75]" />
            </Link>
          )}
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b8fa8]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une conversation…"
            aria-label="Rechercher une conversation"
            className="mm-chat-list-search w-full"
          />
        </div>

        <div className="mm-chat-list-filters mt-3">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "mm-chat-list-filter-btn",
                filter === item.id && "mm-chat-list-filter-btn-active"
              )}
            >
              {item.label}
              <span className="tabular-nums">{filterCounts[item.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {chats.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
          <MessageCircle className="h-12 w-12 text-[#e91e8c]/30" />
          <p className="mt-4 font-semibold text-primary">Aucune discussion</p>
          <Link
            href={emptyCtaHref}
            className="mt-4 text-sm font-semibold text-[#e91e8c] hover:underline"
          >
            {emptyCtaLabel}
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
          <p className="text-sm font-medium text-[#2e1a47]">Aucun résultat</p>
          <p className="mt-1 text-xs text-[#6b5f7a]">
            Essayez un autre filtre ou une autre recherche.
          </p>
        </div>
      ) : (
        <>
          <ul className="mm-chat-list-scroll">
            {filtered.map((chat) => {
              const isActive = activeChatId === chat.id;
              const title = displayTitle(chat, isAdmin);
              const unread = chat.unread_count ?? 0;
              const hasUnread = unread > 0;
              const preview = previewText(chat, isAdmin);
              const online = isOnline(chat);

              return (
                <li key={chat.id}>
                  <Link
                    href={hrefFor(chat)}
                    className={cn(
                      "mm-chat-list-card",
                      isActive && "mm-chat-list-card-active"
                    )}
                  >
                    <div className="mm-chat-list-avatar-slot">
                      <ChatListAvatar
                        type={chat.type}
                        title={title}
                        photo={chat.photo}
                        avatarUrls={chat.avatar_urls}
                        showOnline={online}
                        size="md"
                      />
                    </div>

                    <div className="mm-chat-list-body">
                      <div className="flex items-start gap-2">
                        <div className="flex min-w-0 flex-1 items-center gap-1.5">
                          <p
                            className={cn(
                              "mm-chat-list-name min-w-0",
                              (hasUnread || isActive) &&
                                "mm-chat-list-name-unread"
                            )}
                          >
                            {title}
                          </p>
                          <span
                            className={cn(
                              "mm-chat-type-badge",
                              chat.type === "match_group"
                                ? "mm-chat-type-badge-match"
                                : "mm-chat-type-badge-team"
                            )}
                          >
                            {chat.type === "match_group" ? "Match" : "Équipe"}
                          </span>
                          {online && (
                            <span
                              className="mm-chat-list-online-dot"
                              aria-label="En ligne"
                            />
                          )}
                        </div>

                        <div className="mm-chat-list-meta">
                          {chat.last_message ? (
                            <span
                              className={cn(
                                "mm-chat-list-time",
                                hasUnread && "mm-chat-list-time-unread"
                              )}
                            >
                              {formatChatListTime(
                                chat.last_message.created_at
                              )}
                            </span>
                          ) : (
                            <span className="mm-chat-list-meta-spacer" />
                          )}
                          {hasUnread ? (
                            <span className="mm-chat-list-unread-badge">
                              {unread > 99 ? "99+" : unread}
                            </span>
                          ) : (
                            <span className="mm-chat-list-meta-spacer" />
                          )}
                        </div>
                      </div>

                      <p
                        className={cn(
                          "mm-chat-list-preview",
                          hasUnread && "mm-chat-list-preview-unread"
                        )}
                      >
                        {preview}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {footerVisible && (
            <div className="mm-chat-list-footer">
              <Link
                href={allHref}
                className="flex w-full items-center justify-center rounded-xl border border-[#d8cfe6] bg-white py-3 text-sm font-semibold text-[#5b3d8f] shadow-sm transition-colors hover:border-[#7b3d8f]/40 hover:bg-[#faf8fc]"
              >
                Voir toutes les conversations
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
