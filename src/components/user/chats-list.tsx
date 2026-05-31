import Link from "next/link";
import Image from "next/image";
import { MessageCircle, ChevronRight } from "lucide-react";
import { formatChatListTime, getInitials } from "@/lib/chat/format";
import { matchStatusLabels } from "@/lib/admin/labels";
import type { ChatSummary } from "@/lib/types/database";

interface ChatsListProps {
  chats: ChatSummary[];
  getHref?: (chat: ChatSummary) => string;
}

export function ChatsList({ chats, getHref }: ChatsListProps) {
  const hrefFor = getHref ?? ((chat: ChatSummary) => `/messages/${chat.id}`);

  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl bg-muted/30 px-6 py-16 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
          <MessageCircle className="h-9 w-9 text-secondary/50" />
        </div>
        <p className="mt-5 text-lg font-semibold text-primary">Aucune discussion</p>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Une discussion s&apos;ouvre automatiquement lorsqu&apos;un match est activé.
        </p>
        <Link
          href="/matchs"
          className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-secondary hover:underline"
        >
          Voir mes matchs
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <ul className="divide-y divide-border/50">
        {chats.map((chat) => (
          <li key={chat.id}>
            <Link
              href={hrefFor(chat)}
              className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 active:bg-muted/60"
            >
              <div className="relative h-[52px] w-[52px] shrink-0">
                <div className="relative h-full w-full overflow-hidden rounded-full bg-gradient-to-br from-primary/15 to-secondary/15 ring-1 ring-border/40">
                  {chat.photo ? (
                    <Image
                      src={chat.photo}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="52px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-semibold text-primary">
                      {getInitials(chat.title)}
                    </div>
                  )}
                </div>
                {chat.status === "open" && (
                  <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-semibold text-primary">{chat.title}</p>
                  {chat.last_message && (
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatChatListTime(chat.last_message.created_at)}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-muted-foreground">
                    {chat.last_message?.content ?? "Aucun message"}
                  </p>
                  {chat.status === "closed" && (
                    <span className="shrink-0 text-[10px] uppercase text-muted-foreground">
                      Fermé
                    </span>
                  )}
                </div>
                {chat.match_status && (
                  <p className="mt-0.5 text-[11px] font-medium text-secondary/80">
                    {matchStatusLabels[chat.match_status] ?? chat.match_status}
                  </p>
                )}
              </div>

              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
