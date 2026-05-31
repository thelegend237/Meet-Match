"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Send, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/lib/actions/messages";
import { ChatHeader } from "@/components/user/chat-header";
import {
  formatDateSeparator,
  formatMessageTime,
  groupMessagesByDate,
} from "@/lib/chat/format";
import { toast } from "@/hooks/use-toast";
import type { ChatMessage } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface SenderInfo {
  name: string;
  isAdmin: boolean;
}

interface ChatThreadHeader {
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  backHref?: string;
  isOpen?: boolean;
  isAdmin?: boolean;
}

interface ChatThreadProps {
  chatId: string;
  initialMessages: ChatMessage[];
  senderById: Record<string, SenderInfo>;
  currentUserId: string;
  canSend: boolean;
  header?: ChatThreadHeader;
  className?: string;
}

function MessageBubble({
  msg,
  isMine,
  sender,
  showSenderName,
}: {
  msg: ChatMessage;
  isMine: boolean;
  sender: SenderInfo | null;
  showSenderName: boolean;
}) {
  const isAdmin = sender?.isAdmin ?? false;

  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "relative max-w-[82%] px-3 py-2 shadow-sm sm:max-w-[70%]",
          isMine
            ? "rounded-2xl rounded-br-md bg-secondary text-white"
            : isAdmin
              ? "rounded-2xl rounded-bl-md border border-primary/10 bg-white text-foreground"
              : "rounded-2xl rounded-bl-md bg-white text-foreground"
        )}
      >
        {showSenderName && !isMine && (
          <p
            className={cn(
              "mb-0.5 text-[11px] font-semibold",
              isAdmin ? "text-primary" : "text-secondary"
            )}
          >
            {sender?.name ?? "Équipe"}
            {isAdmin && (
              <span className="ml-1 inline-flex items-center gap-0.5 font-normal opacity-80">
                <Shield className="h-3 w-3" />
                Admin
              </span>
            )}
          </p>
        )}
        <p className="whitespace-pre-wrap text-[15px] leading-snug">{msg.content}</p>
        <p
          className={cn(
            "mt-1 text-right text-[10px] leading-none",
            isMine ? "text-white/70" : "text-muted-foreground"
          )}
        >
          {formatMessageTime(msg.created_at)}
        </p>
      </div>
    </div>
  );
}

export function ChatThread({
  chatId,
  initialMessages,
  senderById,
  currentUserId,
  canSend,
  header,
  className,
}: ChatThreadProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages, chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [chatId]);

  function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const content = input.trim();
    if (!content || !canSend || pending) return;

    startTransition(async () => {
      const result = await sendMessage(chatId, content);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
      } else {
        setInput("");
      }
    });
  }

  const groups = groupMessagesByDate(messages);

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col overflow-hidden bg-card",
        header ? "h-full" : "min-h-[60dvh] rounded-2xl border border-border",
        className
      )}
    >
      {header && (
        <ChatHeader
          title={header.title}
          subtitle={header.subtitle}
          avatarUrl={header.avatarUrl}
          backHref={header.backHref}
          isOpen={header.isOpen}
          isAdmin={header.isAdmin}
        />
      )}

      <div
        ref={scrollRef}
        className="chat-wallpaper flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/80 shadow-sm">
              <Send className="h-7 w-7 text-secondary/60" />
            </div>
            <p className="mt-4 text-sm font-medium text-primary/80">
              Début de la conversation
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Envoyez un message pour démarrer l&apos;échange. Un administrateur
              peut vous accompagner.
            </p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.date} className="space-y-2">
              <div className="flex justify-center py-1">
                <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
                  {formatDateSeparator(group.date)}
                </span>
              </div>
              {group.messages.map((msg, idx) => {
                const isMine = msg.sender_id === currentUserId;
                const sender = msg.sender_id ? senderById[msg.sender_id] : null;
                const prev = group.messages[idx - 1];
                const showSenderName =
                  !isMine &&
                  (!prev ||
                    prev.sender_id !== msg.sender_id ||
                    new Date(msg.created_at).getTime() -
                      new Date(prev.created_at).getTime() >
                      300000);

                return (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMine={isMine}
                    sender={sender}
                    showSenderName={showSenderName}
                  />
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {canSend ? (
        <form
          onSubmit={handleSend}
          className="flex shrink-0 items-end gap-2 border-t border-border/60 bg-[#f0f2f5] px-3 py-2.5 sm:px-4"
        >
          <div className="flex min-h-[44px] flex-1 items-center rounded-3xl border border-border/40 bg-white px-4 shadow-sm">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message…"
              rows={1}
              disabled={pending}
              className="max-h-28 min-h-[24px] w-full resize-none bg-transparent py-2.5 text-[15px] outline-none placeholder:text-muted-foreground/70"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all",
              input.trim()
                ? "bg-secondary text-white shadow-md hover:bg-secondary/90"
                : "bg-muted text-muted-foreground"
            )}
            aria-label="Envoyer"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>
      ) : (
        <div className="shrink-0 border-t border-border/60 bg-muted/50 px-4 py-3 text-center text-sm text-muted-foreground">
          Cette discussion est fermée.
        </div>
      )}
    </div>
  );
}
