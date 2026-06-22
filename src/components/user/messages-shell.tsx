"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { ChatsList } from "@/components/user/chats-list";
import type { ChatSummary } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface MessagesShellProps {
  chats: ChatSummary[];
  children: React.ReactNode;
}

export function MessagesShell({ chats, children }: MessagesShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const activeChatId = pathname.match(/\/messages\/([^/]+)/)?.[1] ?? null;
  const showThread = Boolean(activeChatId);

  useEffect(() => {
    if (activeChatId || chats.length === 0 || pathname !== "/messages") return;
    const mq = window.matchMedia("(min-width: 768px)");
    if (mq.matches) {
      router.replace(`/messages/${chats[0].id}`);
    }
  }, [activeChatId, chats, pathname, router]);

  return (
    <div className="mm-messages-layout flex h-full min-h-0 w-full flex-1 p-2 sm:p-3">
      <div className="mm-messages-panel">
        <aside
          className={cn("mm-chat-list-col", showThread && "hidden md:flex")}
        >
          <ChatsList
            chats={chats}
            activeChatId={activeChatId ?? undefined}
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
                Sélectionnez une conversation
              </h2>
              <p className="mt-2 max-w-sm text-sm text-[#6b5f7a]">
                Vos échanges de match et vos messages avec l&apos;équipe
                s&apos;affichent ici. Choisissez un fil à gauche pour commencer.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
