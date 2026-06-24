"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { ChatsList } from "@/components/user/chats-list";
import type { ChatSummary } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface AdminConversationsShellProps {
  chats: ChatSummary[];
  children: React.ReactNode;
}

export function AdminConversationsShell({
  chats,
  children,
}: AdminConversationsShellProps) {
  const pathname = usePathname();
  const activeChatId =
    pathname.match(/\/admin\/conversations\/([^/]+)/)?.[1] ?? null;
  const showThread = Boolean(activeChatId);

  return (
    <div className="mm-messages-layout flex h-full min-h-0 w-full flex-1 p-2 sm:p-3">
      <div className="mm-messages-panel">
        <aside
          className={cn("mm-chat-list-col", showThread && "hidden md:flex")}
        >
          <ChatsList
            chats={chats}
            variant="admin"
            activeChatId={activeChatId ?? undefined}
            showFooter={false}
          />
        </aside>

        <section
          className={cn("mm-chat-thread-col", !showThread && "hidden md:flex")}
        >
          {showThread ? (
            children
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center bg-[#faf8fc] px-8 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#ede9fe] to-[#fce7f3]">
                <MessageCircle className="h-11 w-11 text-[#e91e8c]/50" />
              </div>
              <h2 className="mt-6 text-xl font-bold text-primary">
                Sélectionnez une discussion
              </h2>
              <p className="mt-2 max-w-sm text-sm text-[#6b5f7a]">
                Les conversations avec au moins un message s&apos;affichent à
                gauche. Utilisez le bouton + pour écrire à un membre.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
