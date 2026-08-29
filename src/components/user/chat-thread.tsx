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
  Ban,
  Check,
  CheckCheck,
  ChevronDown,
  Loader2,
  Lock,
  Paperclip,
  Pencil,
  Send,
  Smile,
  Sparkles,
  Pin,
  X,
} from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  sendMessage,
  editMessage,
  toggleMessagePin,
  deleteMessage,
  deleteMessages,
} from "@/lib/actions/messages";
import { MESSAGE_EDIT_WINDOW_MS } from "@/lib/chat/message-edit";
import { toggleMessageReaction } from "@/lib/actions/reactions";
import { ChatHeader } from "@/components/user/chat-header";
import type { ChatParticipant } from "@/components/user/chat-participants-bar";
import { EmojiPicker } from "@/components/user/emoji-picker";
import { MessageReactionPicker } from "@/components/user/message-reaction-picker";
import { MessageReactions } from "@/components/user/message-reactions";
import { MessageActionMenu } from "@/components/user/message-action-menu";
import { MessageSelectionBar } from "@/components/user/message-selection-bar";
import { MessageInfoDialog } from "@/components/user/message-info-dialog";
import { MessageQuote } from "@/components/user/message-quote";
import {
  MessageReplyBar,
  type ReplyTarget,
} from "@/components/user/message-reply-bar";
import { PinnedMessagesBar } from "@/components/user/pinned-messages-bar";
import { TypingIndicator } from "@/components/user/typing-indicator";
import { AdminQuickReplies } from "@/components/admin/admin-quick-replies";
import {
  formatDateSeparator,
  formatMessageTime,
  getInitials,
  groupMessagesByDate,
} from "@/lib/chat/format";
import { mergeChatMessages } from "@/lib/chat/merge-messages";
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
  canInteract,
  isReactionPickerOpen,
  showReactionEmojiPicker,
  isActionMenuOpen,
  replySenderName,
  canDelete,
  canEdit,
  selectionMode,
  isSelected,
  onToggleSelect,
  onToggleActionMenu,
  onOpenReactionPicker,
  onCloseReactionPicker,
  onToggleReactionEmojiPicker,
  onReact,
  onReply,
  onTogglePin,
  onCopy,
  onSelect,
  onDelete,
  onEdit,
  onInfo,
  onScrollToQuoted,
}: {
  msg: ChatMessage;
  isMine: boolean;
  sender: SenderInfo | null;
  isFirstInCluster: boolean;
  isLastInCluster: boolean;
  showAvatar: boolean;
  currentUserId: string;
  canInteract: boolean;
  isReactionPickerOpen: boolean;
  showReactionEmojiPicker: boolean;
  isActionMenuOpen: boolean;
  replySenderName?: string | null;
  canDelete: boolean;
  canEdit: boolean;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onToggleActionMenu: () => void;
  onOpenReactionPicker: () => void;
  onCloseReactionPicker: () => void;
  onToggleReactionEmojiPicker: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onReply: () => void;
  onTogglePin: () => void;
  onCopy: () => void;
  onSelect: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onInfo: () => void;
  onScrollToQuoted: (messageId: string) => void;
}) {
  const isRead = Boolean(msg.read_at);
  const reactions = msg.reactions ?? [];
  const isAdmin = Boolean(sender?.isAdmin);
  const isDeleted = Boolean(msg.deleted_at);
  const isPinned = Boolean(msg.is_pinned);
  const longPressTimer = useRef<number | null>(null);
  const lastTapRef = useRef(0);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchEnd = () => {
    clearLongPress();
    if (!interactive) return;
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      onReact(msg.id, "❤️");
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  };

  const interactive = canInteract && !isDeleted && !selectionMode;

  const handleTouchStart = () => {
    if (!interactive) return;
    clearLongPress();
    longPressTimer.current = window.setTimeout(() => {
      onToggleActionMenu();
    }, 450);
  };

  const inBubbleClass = isMine
    ? cn("mm-chat-bubble-out", isLastInCluster && "mm-chat-bubble-out-tail")
    : isAdmin
      ? cn("mm-chat-bubble-admin", isLastInCluster && "mm-chat-bubble-admin-tail")
      : cn("mm-chat-bubble-in", isLastInCluster && "mm-chat-bubble-in-tail");

  return (
    <div
      id={`message-${msg.id}`}
      data-message-id={msg.id}
      className={cn(
        "group relative -mx-3 rounded-lg px-3 transition-colors sm:-mx-5 sm:px-5",
        isMine ? "flex justify-end" : "flex justify-start",
        selectionMode && "cursor-pointer",
        isSelected && "bg-[#f3eef8]"
      )}
      onClick={selectionMode ? onToggleSelect : undefined}
      onDoubleClick={() => interactive && onReact(msg.id, "❤️")}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={clearLongPress}
    >
      {selectionMode && (
        <div
          className={cn(
            "flex shrink-0 items-center self-center",
            isMine ? "order-2 pl-2" : "order-1 pr-2"
          )}
        >
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full border",
              isSelected
                ? "border-[#e91e8c] bg-[#e91e8c] text-white"
                : "border-[#c4b5d0] bg-white"
            )}
          >
            {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
          </span>
        </div>
      )}
      <div className="relative flex max-w-[82%] items-start gap-1 sm:max-w-[74%]">
        {interactive && (
          <div
            className={cn(
              "relative shrink-0 self-center",
              isMine ? "order-1" : "order-2"
            )}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleActionMenu();
              }}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border border-[#e8e0f0] bg-white/90 text-[#7b3d8f] shadow-sm transition-all hover:bg-[#f3eef8] hover:text-[#e91e8c] sm:h-7 sm:w-7",
                "opacity-100 sm:opacity-0 sm:group-hover:opacity-100",
                isActionMenuOpen && "opacity-100"
              )}
              aria-label="Actions du message"
              aria-haspopup="menu"
              aria-expanded={isActionMenuOpen}
            >
              <ChevronDown className="h-4 w-4" />
            </button>

            <MessageActionMenu
              visible={isActionMenuOpen && !isReactionPickerOpen}
              isMine={isMine}
              isPinned={isPinned}
              canDelete={canDelete}
              canEdit={canEdit}
              onDismiss={onToggleActionMenu}
              onReply={onReply}
              onTogglePin={onTogglePin}
              onReact={onOpenReactionPicker}
              onCopy={onCopy}
              onSelect={onSelect}
              onDelete={onDelete}
              onEdit={onEdit}
              onInfo={onInfo}
              onQuickReact={(emoji) => onReact(msg.id, emoji)}
              onMoreEmojis={onToggleReactionEmojiPicker}
            />
          </div>
        )}

        {interactive && (
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
        <div className="order-2 flex min-w-0 flex-col items-end">
            <div className={cn(inBubbleClass, "px-3.5 py-2 shadow-sm", isPinned && !isDeleted && "ring-1 ring-[#f5d08a]/80")}>
              {msg.reply_to && !isDeleted ? (
                <MessageQuote
                  senderName={replySenderName ?? "Message"}
                  content={msg.reply_to.content}
                  isMine
                  onClick={() => onScrollToQuoted(msg.reply_to!.id)}
                />
              ) : null}
              {isDeleted ? (
                <p className="flex items-center gap-1.5 text-[15px] italic leading-relaxed text-white/70">
                  <Ban className="h-3.5 w-3.5" />
                  Vous avez supprimé ce message
                </p>
              ) : (
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                  {msg.content}
                </p>
              )}
              {isLastInCluster && (
                <div className="mt-1 flex items-center justify-end gap-1">
                  {isPinned && !isDeleted ? (
                    <Pin className="h-3 w-3 text-white/80" aria-label="Épinglé" />
                  ) : null}
                  {msg.edited_at && !isDeleted ? (
                    <span className="text-[10px] italic text-[#9b8fa8]">modifié</span>
                  ) : null}
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
            {!isDeleted && (
              <MessageReactions
                reactions={reactions}
                currentUserId={currentUserId}
                isMine
                onToggle={(emoji) => onReact(msg.id, emoji)}
              />
            )}
        </div>
      ) : (
        <div className="order-1 flex items-end gap-2">
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
            <div className={cn(inBubbleClass, "px-3.5 py-2 shadow-sm", isPinned && !isDeleted && "ring-1 ring-[#f5d08a]/80")}>
              {msg.reply_to && !isDeleted ? (
                <MessageQuote
                  senderName={replySenderName ?? "Message"}
                  content={msg.reply_to.content}
                  isMine={false}
                  onClick={() => onScrollToQuoted(msg.reply_to!.id)}
                />
              ) : null}
              {isDeleted ? (
                <p className="flex items-center gap-1.5 text-[15px] italic leading-relaxed text-[#9b8fa8]">
                  <Ban className="h-3.5 w-3.5" />
                  Ce message a été supprimé
                </p>
              ) : (
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                  {msg.content}
                </p>
              )}
              {isLastInCluster && (
                <div className="mt-1 flex items-center justify-end gap-1">
                  {isPinned && !isDeleted ? (
                    <Pin className="h-3 w-3 text-[#e91e8c]" aria-label="Épinglé" />
                  ) : null}
                  {msg.edited_at && !isDeleted ? (
                    <span className="text-[10px] italic text-[#9b8fa8]">modifié</span>
                  ) : null}
                  <span className="text-[10px] text-[#9b8fa8]">
                    {formatMessageTime(msg.created_at)}
                  </span>
                </div>
              )}
            </div>
            {!isDeleted && (
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
  const [newMessagesBelow, setNewMessagesBelow] = useState(0);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [editingMessage, setEditingMessage] = useState<{
    id: string;
    original: string;
  } | null>(null);
  const [messageInfoId, setMessageInfoId] = useState<string | null>(null);
  const [activeActionMessageId, setActiveActionMessageId] = useState<
    string | null
  >(null);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<
    string | null
  >(null);
  const [reactionEmojiPickerId, setReactionEmojiPickerId] = useState<
    string | null
  >(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutsRef = useRef<Record<string, number>>({});
  const lastTypingSentRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageIdsRef = useRef(new Set<string>());
  const isNearBottomRef = useRef(true);
  const prevLastMessageIdRef = useRef<string | null>(null);
  const chatIdRef = useRef(chatId);

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
    setNewMessagesBelow(0);
  }, []);

  const scrollToMessage = useCallback((messageId: string) => {
    const el = document.getElementById(`message-${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("mm-chat-message-highlight");
    window.setTimeout(() => {
      el.classList.remove("mm-chat-message-highlight");
    }, 1600);
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  useEffect(() => {
    if (chatIdRef.current !== chatId) {
      chatIdRef.current = chatId;
      setMessages(initialMessages);
      setReplyTo(null);
      setEditingMessage(null);
      setNewMessagesBelow(0);
      isNearBottomRef.current = true;
      prevLastMessageIdRef.current =
        initialMessages[initialMessages.length - 1]?.id ?? null;
      requestAnimationFrame(() => scrollToBottom("auto"));
      return;
    }

    setMessages((prev) => mergeChatMessages(prev, initialMessages));
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
      const nearBottom = distance < 120;
      isNearBottomRef.current = nearBottom;
      setShowScrollFab(!nearBottom && messages.length > 0);
      if (nearBottom) {
        setNewMessagesBelow(0);
      }
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [messages.length]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const lastId = lastMessage?.id ?? null;
    const prevLastId = prevLastMessageIdRef.current;

    if (!lastId || lastId === prevLastId) return;

    const isNewAppend = Boolean(prevLastId);
    prevLastMessageIdRef.current = lastId;

    if (!isNewAppend) return;

    if (isNearBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom("smooth"));
      return;
    }

    if (lastMessage.sender_id !== currentUserId) {
      setNewMessagesBelow((count) => count + 1);
      setShowScrollFab(true);
    }
  }, [messages, currentUserId, scrollToBottom]);

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

            let replyToPreview = msg.reply_to ?? null;
            if (!replyToPreview && msg.reply_to_id) {
              const parent = prev.find((m) => m.id === msg.reply_to_id);
              if (parent) {
                replyToPreview = {
                  id: parent.id,
                  content: parent.content,
                  sender_id: parent.sender_id,
                };
              }
            }

            return [
              ...prev,
              {
                ...msg,
                reactions: msg.reactions ?? [],
                reply_to: replyToPreview,
              },
            ];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.map((message) =>
              message.id === updated.id
                ? {
                    ...message,
                    ...updated,
                    reactions: message.reactions,
                    reply_to: message.reply_to ?? updated.reply_to,
                  }
                : message
            )
          );
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

  const currentUserName =
    senderById[currentUserId]?.name ||
    header?.participants?.find((p) => p.id === currentUserId)?.name ||
    "Quelqu'un";

  useEffect(() => {
    const supabase = createClient();
    const timeouts = typingTimeoutsRef.current;
    const channel = supabase.channel(`chat-typing:${chatId}`, {
      config: { broadcast: { self: false } },
    });

    const clearUserTimeout = (userId: string) => {
      if (timeouts[userId]) {
        window.clearTimeout(timeouts[userId]);
        delete timeouts[userId];
      }
    };

    channel
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const userId = payload?.userId as string | undefined;
        const name = (payload?.name as string | undefined) ?? "Quelqu'un";
        if (!userId || userId === currentUserId) return;

        setTypingUsers((prev) => ({ ...prev, [userId]: name }));
        clearUserTimeout(userId);
        timeouts[userId] = window.setTimeout(() => {
          setTypingUsers((prev) => {
            const next = { ...prev };
            delete next[userId];
            return next;
          });
          delete timeouts[userId];
        }, 3500);
      })
      .on("broadcast", { event: "stop_typing" }, ({ payload }) => {
        const userId = payload?.userId as string | undefined;
        if (!userId) return;
        clearUserTimeout(userId);
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      })
      .subscribe();

    typingChannelRef.current = channel;

    return () => {
      Object.values(timeouts).forEach((t) => window.clearTimeout(t));
      Object.keys(timeouts).forEach((k) => delete timeouts[k]);
      setTypingUsers({});
      typingChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [chatId, currentUserId]);

  const broadcastTyping = useCallback(() => {
    const channel = typingChannelRef.current;
    if (!channel) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < 1500) return;
    lastTypingSentRef.current = now;
    void channel.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId, name: currentUserName },
    });
  }, [currentUserId, currentUserName]);

  const broadcastStopTyping = useCallback(() => {
    const channel = typingChannelRef.current;
    if (!channel) return;
    lastTypingSentRef.current = 0;
    void channel.send({
      type: "broadcast",
      event: "stop_typing",
      payload: { userId: currentUserId },
    });
  }, [currentUserId]);

  function insertEmoji(emoji: string) {
    setInput((prev) => `${prev}${emoji}`);
    textareaRef.current?.focus();
  }

  function insertQuickReply(content: string) {
    setInput(content);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      resizeTextarea();
    });
  }

  function handleReact(messageId: string, emoji: string) {
    setActiveActionMessageId(null);
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

  function handleReply(message: ChatMessage) {
    const sender = message.sender_id ? senderById[message.sender_id] : null;
    setReplyTo({
      id: message.id,
      content: message.content,
      senderName: sender?.name ?? "Équipe",
    });
    setActiveActionMessageId(null);
    setActiveReactionMessageId(null);
    textareaRef.current?.focus();
  }

  function handleTogglePin(messageId: string) {
    setActiveActionMessageId(null);

    setMessages((prev) =>
      prev.map((message) => {
        if (message.id !== messageId) return message;
        const nextPinned = !message.is_pinned;
        return {
          ...message,
          is_pinned: nextPinned,
          pinned_at: nextPinned ? new Date().toISOString() : null,
          pinned_by: nextPinned ? currentUserId : null,
        };
      })
    );

    void toggleMessagePin(messageId).then((result) => {
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
      }
    });
  }

  const isStaffView = Boolean(header?.isStaffView);

  const canDeleteMessage = useCallback(
    (message: ChatMessage) =>
      !message.deleted_at &&
      (message.sender_id === currentUserId || isStaffView),
    [currentUserId, isStaffView]
  );

  const canEditMessage = useCallback(
    (message: ChatMessage) =>
      !message.deleted_at &&
      message.sender_id === currentUserId &&
      Date.now() - new Date(message.created_at).getTime() <
        MESSAGE_EDIT_WINDOW_MS,
    [currentUserId]
  );

  function handleInfo(messageId: string) {
    setActiveActionMessageId(null);
    setMessageInfoId(messageId);
  }

  const infoMessage = messageInfoId
    ? messages.find((m) => m.id === messageInfoId) ?? null
    : null;

  function handleEdit(message: ChatMessage) {
    setActiveActionMessageId(null);
    setActiveReactionMessageId(null);
    setReplyTo(null);
    setEditingMessage({ id: message.id, original: message.content });
    setInput(message.content);
    requestAnimationFrame(() => {
      resizeTextarea();
      textareaRef.current?.focus();
    });
  }

  function cancelEdit() {
    setEditingMessage(null);
    setInput("");
    requestAnimationFrame(() => resizeTextarea());
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copié", description: "Message copié dans le presse-papiers." });
    } catch {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Copie impossible sur cet appareil.",
      });
    }
  }

  function handleCopy(message: ChatMessage) {
    setActiveActionMessageId(null);
    void copyToClipboard(message.content);
  }

  function handleDelete(messageId: string) {
    setActiveActionMessageId(null);

    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? {
              ...message,
              content: "Ce message a été supprimé",
              deleted_at: new Date().toISOString(),
              deleted_by: currentUserId,
              is_pinned: false,
              reactions: [],
            }
          : message
      )
    );

    void deleteMessage(messageId).then((result) => {
      if ("error" in result && result.error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
      }
    });
  }

  function enterSelection(messageId: string) {
    setActiveActionMessageId(null);
    setActiveReactionMessageId(null);
    setSelectionMode(true);
    setSelectedIds(new Set([messageId]));
  }

  function toggleSelect(messageId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }

  function cancelSelection() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  function handleCopySelected() {
    const selected = messages
      .filter((m) => selectedIds.has(m.id) && !m.deleted_at)
      .map((m) => m.content);
    if (!selected.length) return;
    void copyToClipboard(selected.join("\n"));
    cancelSelection();
  }

  function handleDeleteSelected() {
    const deletable = messages.filter(
      (m) => selectedIds.has(m.id) && canDeleteMessage(m)
    );
    if (!deletable.length) return;
    const ids = deletable.map((m) => m.id);

    setMessages((prev) =>
      prev.map((message) =>
        ids.includes(message.id)
          ? {
              ...message,
              content: "Ce message a été supprimé",
              deleted_at: new Date().toISOString(),
              deleted_by: currentUserId,
              is_pinned: false,
              reactions: [],
            }
          : message
      )
    );
    cancelSelection();

    void deleteMessages(ids).then((result) => {
      if ("error" in result && result.error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
      }
    });
  }

  const selectedCount = selectedIds.size;
  const selectedDeletableCount = messages.filter(
    (m) => selectedIds.has(m.id) && canDeleteMessage(m)
  ).length;

  const typingNames = Object.values(typingUsers);
  const typingLabel =
    typingNames.length === 0
      ? null
      : typingNames.length === 1
        ? `${typingNames[0]} est en train d'écrire…`
        : typingNames.length === 2
          ? `${typingNames[0]} et ${typingNames[1]} écrivent…`
          : "Plusieurs personnes écrivent…";

  function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const content = input.trim();
    if (!content || !canSend || pending) return;

    if (editingMessage) {
      const editId = editingMessage.id;
      if (content === editingMessage.original) {
        cancelEdit();
        return;
      }

      setMessages((prev) =>
        prev.map((message) =>
          message.id === editId
            ? { ...message, content, edited_at: new Date().toISOString() }
            : message
        )
      );

      startTransition(async () => {
        const result = await editMessage(editId, content);
        if (result.error) {
          toast({
            variant: "destructive",
            title: "Erreur",
            description: result.error,
          });
        } else {
          setInput("");
          setEditingMessage(null);
          setEmojiPickerOpen(false);
          broadcastStopTyping();
          requestAnimationFrame(() => resizeTextarea());
        }
      });
      return;
    }

    const replyToId = replyTo?.id ?? null;

    startTransition(async () => {
      const result = await sendMessage(chatId, content, replyToId);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
      } else {
        setInput("");
        setReplyTo(null);
        setEmojiPickerOpen(false);
        broadcastStopTyping();
        requestAnimationFrame(() => {
          resizeTextarea();
          scrollToBottom();
        });
      }
    });
  }

  const pinnedMessages = [...messages]
    .filter((message) => message.is_pinned)
    .sort((a, b) => (b.pinned_at ?? "").localeCompare(a.pinned_at ?? ""));

  const senderNameById = Object.fromEntries(
    Object.entries(senderById).map(([id, info]) => [id, info.name])
  );

  function resolveReplySenderName(senderId: string | null | undefined) {
    if (!senderId) return "Équipe";
    return senderById[senderId]?.name ?? "Membre";
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
          typingLabel={typingLabel}
          headerActions={header.headerActions}
        />
      )}

      {selectionMode && (
        <MessageSelectionBar
          count={selectedCount}
          canDelete={selectedDeletableCount > 0}
          onCopy={handleCopySelected}
          onDelete={handleDeleteSelected}
          onCancel={cancelSelection}
        />
      )}

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="mm-chat-messages h-full space-y-4 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5"
          onClick={() => {
            setActiveActionMessageId(null);
            setActiveReactionMessageId(null);
            setReactionEmojiPickerId(null);
          }}
        >
          <PinnedMessagesBar
            pinnedMessages={pinnedMessages}
            senderNameById={senderNameById}
            onScrollTo={scrollToMessage}
            onUnpin={handleTogglePin}
          />
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
                          canInteract
                          isReactionPickerOpen={
                            activeReactionMessageId === msg.id
                          }
                          showReactionEmojiPicker={
                            reactionEmojiPickerId === msg.id
                          }
                          isActionMenuOpen={activeActionMessageId === msg.id}
                          replySenderName={
                            msg.reply_to
                              ? resolveReplySenderName(msg.reply_to.sender_id)
                              : null
                          }
                          canDelete={canDeleteMessage(msg)}
                          canEdit={canEditMessage(msg)}
                          selectionMode={selectionMode}
                          isSelected={selectedIds.has(msg.id)}
                          onToggleSelect={() => toggleSelect(msg.id)}
                          onToggleActionMenu={() =>
                            setActiveActionMessageId((current) =>
                              current === msg.id ? null : msg.id
                            )
                          }
                          onOpenReactionPicker={() => {
                            setActiveActionMessageId(null);
                            setActiveReactionMessageId(msg.id);
                          }}
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
                          onReply={() => handleReply(msg)}
                          onTogglePin={() => handleTogglePin(msg.id)}
                          onCopy={() => handleCopy(msg)}
                          onSelect={() => enterSelection(msg.id)}
                          onDelete={() => handleDelete(msg.id)}
                          onEdit={() => handleEdit(msg)}
                          onInfo={() => handleInfo(msg.id)}
                          onScrollToQuoted={scrollToMessage}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            ))
          )}
          {Object.keys(typingUsers).length > 0 && (
            <TypingIndicator names={Object.values(typingUsers)} />
          )}
          <div ref={bottomRef} className="h-px shrink-0" />
        </div>

        {showScrollFab && (
          <button
            type="button"
            onClick={() => scrollToBottom()}
            className="mm-chat-scroll-fab"
            aria-label={
              newMessagesBelow > 0
                ? `${newMessagesBelow} nouveau${newMessagesBelow > 1 ? "x" : ""} message${newMessagesBelow > 1 ? "s" : ""}`
                : "Aller aux derniers messages"
            }
          >
            {newMessagesBelow > 0 ? (
              <span className="text-xs font-bold">{newMessagesBelow}</span>
            ) : (
              <ArrowDown className="h-5 w-5" />
            )}
          </button>
        )}
      </div>

      {selectionMode ? null : canSend ? (
        <form
          onSubmit={(e) => e.preventDefault()}
          className="mm-chat-input-bar pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          {isStaffView ? (
            <AdminQuickReplies
              onSelect={insertQuickReply}
              disabled={pending}
            />
          ) : null}
          {editingMessage ? (
            <div className="flex items-stretch gap-2 border-b border-[#ebe6f0]/90 bg-[#faf8fc] px-3 py-2 sm:px-4">
              <div className="min-w-0 flex-1 border-l-[3px] border-[#e91e8c] pl-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-[#e91e8c]">
                  <Pencil className="h-3.5 w-3.5" />
                  Modifier le message
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-[#6b5f7a]">
                  {editingMessage.original}
                </p>
              </div>
              <button
                type="button"
                onClick={cancelEdit}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#9b8fa8] hover:bg-[#f3eef8]"
                aria-label="Annuler la modification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : replyTo ? (
            <MessageReplyBar replyTo={replyTo} onCancel={() => setReplyTo(null)} />
          ) : null}
          <div className="relative flex w-full items-end gap-2 sm:gap-2.5">
          {emojiPickerOpen ? (
            <>
              <div
                className="fixed inset-0 z-[60] sm:hidden"
                role="presentation"
                onClick={() => setEmojiPickerOpen(false)}
              >
                <div className="absolute inset-0 bg-black/30" aria-hidden />
                <div
                  className="absolute bottom-0 left-0 right-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <EmojiPicker
                    onSelect={insertEmoji}
                    onClose={() => setEmojiPickerOpen(false)}
                    className="mx-auto w-full max-w-none"
                  />
                </div>
              </div>
              <div className="absolute bottom-full left-3 mb-2 hidden sm:block sm:left-4">
                <EmojiPicker
                  onSelect={insertEmoji}
                  onClose={() => setEmojiPickerOpen(false)}
                />
              </div>
            </>
          ) : null}
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
              onChange={(e) => {
                setInput(e.target.value);
                if (e.target.value.trim()) {
                  broadcastTyping();
                } else {
                  broadcastStopTyping();
                }
              }}
              placeholder={editingMessage ? "Modifier le message…" : "Écrire un message…"}
              rows={1}
              disabled={pending}
              className="max-h-[120px] min-h-[24px] w-full resize-none bg-transparent py-2.5 text-[15px] leading-snug text-[#2e1a47] outline-none placeholder:text-[#9b8fa8]"
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
            type="button"
            disabled={pending || !input.trim()}
            onClick={() => handleSend()}
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
          </div>
        </form>
      ) : (
        <div className="mm-chat-closed-banner">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>Discussion fermée</span>
        </div>
      )}

      {infoMessage && !infoMessage.deleted_at ? (
        <MessageInfoDialog
          message={infoMessage}
          currentUserId={currentUserId}
          onClose={() => setMessageInfoId(null)}
        />
      ) : null}
    </div>
  );
}
