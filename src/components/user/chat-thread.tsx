"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import Image from "next/image";
import {
  ArrowDown,
  CheckCheck,
  Loader2,
  Lock,
  Paperclip,
  Send,
  Smile,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/lib/actions/messages";
import { toggleMessageReaction } from "@/lib/actions/reactions";
import { ChatHeader } from "@/components/user/chat-header";
import type { ChatParticipant } from "@/components/user/chat-participants-bar";
import { EmojiPicker } from "@/components/user/emoji-picker";
import { MessageReactionPicker } from "@/components/user/message-reaction-picker";
import { MessageReactions } from "@/components/user/message-reactions";
import {
  formatDateSeparator,
  formatMessageTime,
  getInitials,
  groupMessagesByDate,
} from "@/lib/chat/format";
import {
  applyReactionToggle,
  mergeReactionFromRealtime,
} from "@/lib/chat/reactions";
import { TEAM_AVATAR_URL, TEAM_DISPLAY_NAME } from "@/lib/chat/team";
import { toast } from "@/hooks/use-toast";
import type { ChatMessage, MessageReaction } from "@/lib/types/database";
import { cn } from "@/lib/utils";

const CLUSTER_GAP_MS = 120_000;

interface SenderInfo {
  name: string;
  isAdmin: boolean;
  photo?: string | null;
}

interface ChatThreadHeader {
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
}

interface ChatThreadProps {
  chatId: string;
  initialMessages: ChatMessage[];
  senderById: Record<string, SenderInfo>;
  currentUserId: string;
  canSend: boolean;
  header?: ChatThreadHeader;
  matchPartnerName?: string | null;
  className?: string;
}

function clusterMessages(messages: ChatMessage[]) {
  const clusters: ChatMessage[][] = [];

  for (const msg of messages) {
    const lastCluster = clusters[clusters.length - 1];
    const prev = lastCluster?.[lastCluster.length - 1];
    const sameCluster =
      prev &&
      prev.sender_id === msg.sender_id &&
      new Date(msg.created_at).getTime() -
        new Date(prev.created_at).getTime() <
        CLUSTER_GAP_MS;

    if (sameCluster && lastCluster) {
      lastCluster.push(msg);
    } else {
      clusters.push([msg]);
    }
  }

  return clusters;
}

function SenderAvatar({ sender }: { sender: SenderInfo | null }) {
  const isTeam = sender?.isAdmin || !sender;
  const name = sender?.name ?? TEAM_DISPLAY_NAME;
  const photo = sender?.photo ?? (isTeam ? TEAM_AVATAR_URL : null);

  return (
    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#7b3d8f]/10 to-[#e91e8c]/10">
      {photo ? (
        <Image
          src={photo}
          alt=""
          fill
          className={cn(
            isTeam
              ? "object-contain object-center p-0.5"
              : "object-cover object-center"
          )}
          sizes="32px"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-[9px] font-bold text-[#5b3d8f]">
          {getInitials(name)}
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  msg,
  isMine,
  sender,
  isFirstInCluster,
  isLastInCluster,
  showAvatar,
  currentUserId,
  canReact,
  isReactionPickerOpen,
  showReactionEmojiPicker,
  onOpenReactionPicker,
  onCloseReactionPicker,
  onToggleReactionEmojiPicker,
  onReact,
}: {
  msg: ChatMessage;
  isMine: boolean;
  sender: SenderInfo | null;
  isFirstInCluster: boolean;
  isLastInCluster: boolean;
  showAvatar: boolean;
  currentUserId: string;
  canReact: boolean;
  isReactionPickerOpen: boolean;
  showReactionEmojiPicker: boolean;
  onOpenReactionPicker: () => void;
  onCloseReactionPicker: () => void;
  onToggleReactionEmojiPicker: () => void;
  onReact: (messageId: string, emoji: string) => void;
}) {
  const isRead = Boolean(msg.read_at);
  const reactions = msg.reactions ?? [];
  const isAdmin = Boolean(sender?.isAdmin);
  const longPressTimer = useRef<number | null>(null);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchStart = () => {
    if (!canReact) return;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      onOpenReactionPicker();
    }, 500);
  };

  const inBubbleClass = isMine
    ? cn("mm-chat-bubble-out", isLastInCluster && "mm-chat-bubble-out-tail")
    : isAdmin
      ? cn("mm-chat-bubble-admin", isLastInCluster && "mm-chat-bubble-admin-tail")
      : cn("mm-chat-bubble-in", isLastInCluster && "mm-chat-bubble-in-tail");

  return (
    <div
      className={cn("group relative", isMine ? "flex justify-end" : "flex justify-start")}
      onMouseEnter={() => canReact && onOpenReactionPicker()}
      onMouseLeave={() => {
        if (!showReactionEmojiPicker) onCloseReactionPicker();
      }}
      onDoubleClick={() => canReact && onReact(msg.id, "❤️")}
      onTouchStart={handleTouchStart}
      onTouchEnd={clearLongPress}
      onTouchMove={clearLongPress}
    >
      {canReact && (
        <MessageReactionPicker
          visible={isReactionPickerOpen}
          isMine={isMine}
          showEmojiPicker={showReactionEmojiPicker}
          onReact={(emoji) => onReact(msg.id, emoji)}
          onToggleEmojiPicker={onToggleReactionEmojiPicker}
          onCloseEmojiPicker={onCloseReactionPicker}
        />
      )}

      {isMine ? (
        <div className="flex max-w-[82%] flex-row-reverse items-end gap-2 sm:max-w-[70%]">
          <div className="w-8 shrink-0" aria-hidden />
          <div className="flex min-w-0 flex-col items-end">
            <div className={cn(inBubbleClass, "px-3.5 py-2 shadow-sm")}>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                {msg.content}
              </p>
              {isLastInCluster && (
                <div className="mt-1 flex items-center justify-end gap-1">
                  <span className="text-[10px] text-[#9b8fa8]">
                    {formatMessageTime(msg.created_at)}
                  </span>
                  <CheckCheck
                    className={cn(
                      "h-3.5 w-3.5",
                      isRead ? "text-[#e91e8c]" : "text-[#c4b5d0]"
                    )}
                    aria-label={isRead ? "Lu" : "Envoyé"}
                  />
                </div>
              )}
            </div>
            {isLastInCluster && (
              <MessageReactions
                reactions={reactions}
                currentUserId={currentUserId}
                isMine
                onToggle={(emoji) => onReact(msg.id, emoji)}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex max-w-[82%] items-end gap-2 sm:max-w-[70%]">
          {showAvatar ? (
            <SenderAvatar sender={sender} />
          ) : (
            <div className="w-8 shrink-0" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            {isFirstInCluster && (
              <div className="mb-1 flex items-baseline gap-2 px-0.5">
                <p className="text-xs font-semibold text-[#2e1a47]">
                  {sender?.name ?? "Équipe"}
                  {isAdmin && (
                    <span className="mm-chat-admin-badge">Admin</span>
                  )}
                </p>
              </div>
            )}
            <div className={cn(inBubbleClass, "px-3.5 py-2 shadow-sm")}>
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                {msg.content}
              </p>
              {isLastInCluster && (
                <p className="mt-1 text-right text-[10px] text-[#9b8fa8]">
                  {formatMessageTime(msg.created_at)}
                </p>
              )}
            </div>
            {isLastInCluster && (
              <MessageReactions
                reactions={reactions}
                currentUserId={currentUserId}
                isMine={false}
                onToggle={(emoji) => onReact(msg.id, emoji)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchWelcomeBanner({ partnerName }: { partnerName?: string | null }) {
  return (
    <div className="mm-chat-match-welcome">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#ede9fe] to-[#fce7f3]">
        <Sparkles className="h-5 w-5 text-[#e91e8c]" />
      </div>
      <p className="text-sm font-bold text-[#2e1a47]">
        Votre match est confirmé
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-[#6b5f7a]">
        {partnerName ? (
          <>
            Présentez-vous à <strong>{partnerName}</strong> dans le respect.
          </>
        ) : (
          <>Présentez-vous et échangez dans le respect.</>
        )}{" "}
        L&apos;équipe Meet &amp; Match accompagne cette discussion.
      </p>
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
  matchPartnerName,
  className,
}: ChatThreadProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [showScrollFab, setShowScrollFab] = useState(false);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<
    string | null
  >(null);
  const [reactionEmojiPickerId, setReactionEmojiPickerId] = useState<
    string | null
  >(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageIdsRef = useRef(new Set<string>());
  const isNearBottomRef = useRef(true);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
    isNearBottomRef.current = true;
    setShowScrollFab(false);
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  useEffect(() => {
    setMessages(initialMessages);
    isNearBottomRef.current = true;
    requestAnimationFrame(() => scrollToBottom("auto"));
  }, [initialMessages, chatId, scrollToBottom]);

  useEffect(() => {
    messageIdsRef.current = new Set(messages.map((m) => m.id));
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function onScroll() {
      if (!el) return;
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const nearBottom = distance < 100;
      isNearBottomRef.current = nearBottom;
      setShowScrollFab(!nearBottom && messages.length > 0);
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [messages.length]);

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
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
            return [...prev, { ...msg, reactions: [] }];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          const row = payload.new as MessageReaction;
          if (!messageIdsRef.current.has(row.message_id)) return;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === row.message_id
                ? {
                    ...message,
                    reactions: mergeReactionFromRealtime(
                      message.reactions ?? [],
                      row,
                      "INSERT"
                    ),
                  }
                : message
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          const row = payload.new as MessageReaction;
          if (!messageIdsRef.current.has(row.message_id)) return;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === row.message_id
                ? {
                    ...message,
                    reactions: mergeReactionFromRealtime(
                      message.reactions ?? [],
                      row,
                      "UPDATE"
                    ),
                  }
                : message
            )
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          const row = payload.old as MessageReaction;
          if (!messageIdsRef.current.has(row.message_id)) return;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === row.message_id
                ? {
                    ...message,
                    reactions: mergeReactionFromRealtime(
                      message.reactions ?? [],
                      row,
                      "DELETE"
                    ),
                  }
                : message
            )
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [chatId]);

  function insertEmoji(emoji: string) {
    setInput((prev) => `${prev}${emoji}`);
    textareaRef.current?.focus();
  }

  function handleReact(messageId: string, emoji: string) {
    setActiveReactionMessageId(null);
    setReactionEmojiPickerId(null);

    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? {
              ...message,
              reactions: applyReactionToggle(
                message.reactions ?? [],
                messageId,
                currentUserId,
                emoji
              ),
            }
          : message
      )
    );

    void toggleMessageReaction(messageId, emoji).then((result) => {
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
      }
    });
  }

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
        setEmojiPickerOpen(false);
        requestAnimationFrame(() => {
          resizeTextarea();
          scrollToBottom();
        });
      }
    });
  }

  const groups = groupMessagesByDate(messages);
  const showMatchWelcome =
    header?.isMatchGroup && messages.length <= 6;

  const presenceTracker = (() => {
    const sender = senderById[currentUserId];
    if (sender) {
      return {
        name: sender.name,
        photo: sender.photo ?? null,
        isAdmin: sender.isAdmin,
      };
    }
    const participant = header?.participants?.find(
      (p) => p.id === currentUserId
    );
    if (!participant) return undefined;
    return {
      name: participant.name,
      photo: participant.photo,
      isAdmin: participant.isAdmin,
    };
  })();

  function handleAttachmentClick() {
    toast({
      title: "Fonction en préparation",
      description: "L'envoi de pièces jointes sera disponible prochainement.",
    });
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden bg-card",
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
          isStaffView={header.isStaffView}
          isMatchGroup={header.isMatchGroup}
          matchId={header.matchId}
          chatId={chatId}
          currentUserId={currentUserId}
          participants={header.participants}
          presenceTracker={presenceTracker}
          headerActions={header.headerActions}
        />
      )}

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="mm-chat-messages h-full space-y-4 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5"
          onClick={() => {
            setActiveReactionMessageId(null);
            setReactionEmojiPickerId(null);
          }}
        >
          {showMatchWelcome && (
            <MatchWelcomeBanner partnerName={matchPartnerName} />
          )}

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/80 shadow-sm">
                <Send className="h-7 w-7 text-secondary/60" />
              </div>
              <p className="mt-4 text-sm font-medium text-primary/80">
                Début de la conversation
              </p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Écrivez un message pour lancer l&apos;échange.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.date} className="space-y-3">
                <div className="flex justify-center py-1">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm">
                    {formatDateSeparator(group.date)}
                  </span>
                </div>
                {clusterMessages(group.messages).map((cluster) => (
                  <div key={cluster[0].id} className="mm-chat-cluster">
                    {cluster.map((msg, idx) => {
                      const isMine = msg.sender_id === currentUserId;
                      const sender = msg.sender_id
                        ? senderById[msg.sender_id]
                        : null;
                      const isFirstInCluster = idx === 0;
                      const isLastInCluster = idx === cluster.length - 1;
                      const showAvatar =
                        !isMine && isLastInCluster;

                      return (
                        <MessageBubble
                          key={msg.id}
                          msg={msg}
                          isMine={isMine}
                          sender={sender}
                          isFirstInCluster={isFirstInCluster}
                          isLastInCluster={isLastInCluster}
                          showAvatar={showAvatar}
                          currentUserId={currentUserId}
                          canReact
                          isReactionPickerOpen={
                            activeReactionMessageId === msg.id
                          }
                          showReactionEmojiPicker={
                            reactionEmojiPickerId === msg.id
                          }
                          onOpenReactionPicker={() =>
                            setActiveReactionMessageId(msg.id)
                          }
                          onCloseReactionPicker={() => {
                            setActiveReactionMessageId(null);
                            setReactionEmojiPickerId(null);
                          }}
                          onToggleReactionEmojiPicker={() =>
                            setReactionEmojiPickerId((current) =>
                              current === msg.id ? null : msg.id
                            )
                          }
                          onReact={handleReact}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            ))
          )}
          <div ref={bottomRef} className="h-px shrink-0" />
        </div>

        {showScrollFab && (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            className="mm-chat-scroll-fab"
            aria-label="Aller aux derniers messages"
          >
            <ArrowDown className="h-5 w-5" />
          </button>
        )}
      </div>

      {canSend ? (
        <form
          onSubmit={handleSend}
          className="relative mm-chat-input-bar pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          {emojiPickerOpen && (
            <div className="absolute bottom-full left-3 mb-2 sm:left-4">
              <EmojiPicker
                onSelect={insertEmoji}
                onClose={() => setEmojiPickerOpen(false)}
              />
            </div>
          )}
          <button
            type="button"
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#9b8fa8] transition-colors hover:bg-[#f3eef8] hover:text-[#5b3d8f]"
            aria-label="Pièce jointe (bientôt disponible)"
            onClick={handleAttachmentClick}
            title="Pièces jointes bientôt disponibles"
          >
            <Paperclip className="h-5 w-5 stroke-[1.75]" />
          </button>
          <div className="mm-chat-input-field">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Écrire un message…"
              rows={1}
              disabled={pending}
              className="max-h-[120px] min-h-[24px] w-full resize-none bg-transparent py-2.5 text-[15px] leading-snug text-[#2e1a47] outline-none placeholder:text-[#9b8fa8]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              type="button"
              className={cn(
                "mb-1 mr-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                emojiPickerOpen
                  ? "bg-[#fce8f3] text-[#e91e8c]"
                  : "text-[#9b8fa8] hover:bg-[#f3eef8] hover:text-[#5b3d8f]"
              )}
              aria-label="Insérer un emoji"
              onClick={() => setEmojiPickerOpen((open) => !open)}
            >
              <Smile className="h-[18px] w-[18px] stroke-[1.75]" />
            </button>
          </div>
          <button
            type="submit"
            disabled={pending || !input.trim()}
            className={cn(
              "mm-chat-send-btn mb-0.5",
              input.trim() ? "mm-chat-send-btn-active" : "mm-chat-send-btn-idle"
            )}
            aria-label="Envoyer"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-[18px] w-[18px] stroke-[2]" />
            )}
          </button>
        </form>
      ) : (
        <div className="mm-chat-closed-banner">
          <Lock className="h-4 w-4 shrink-0 text-[#9b8fa8]" />
          <span>
            Cette discussion est fermée — vous ne pouvez plus envoyer de
            messages.
          </span>
        </div>
      )}
    </div>
  );
}
