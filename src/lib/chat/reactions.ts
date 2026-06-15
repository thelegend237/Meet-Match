import type { MessageReaction, ReactionSummary } from "@/lib/types/database";

export function groupMessageReactions(
  reactions: MessageReaction[],
  currentUserId: string
): ReactionSummary[] {
  const byEmoji = new Map<string, ReactionSummary>();

  for (const reaction of reactions) {
    const existing = byEmoji.get(reaction.emoji);
    if (existing) {
      existing.count += 1;
      existing.userIds.push(reaction.user_id);
      if (reaction.user_id === currentUserId) {
        existing.reactedByMe = true;
      }
    } else {
      byEmoji.set(reaction.emoji, {
        emoji: reaction.emoji,
        count: 1,
        userIds: [reaction.user_id],
        reactedByMe: reaction.user_id === currentUserId,
      });
    }
  }

  return [...byEmoji.values()].sort((a, b) => b.count - a.count);
}

export function applyReactionToggle(
  reactions: MessageReaction[],
  messageId: string,
  userId: string,
  emoji: string
): MessageReaction[] {
  const existing = reactions.find(
    (r) => r.message_id === messageId && r.user_id === userId
  );

  if (existing?.emoji === emoji) {
    return reactions.filter((r) => r.id !== existing.id);
  }

  const withoutUser = reactions.filter(
    (r) => !(r.message_id === messageId && r.user_id === userId)
  );

  return [
    ...withoutUser,
    {
      id: existing?.id ?? `optimistic-${messageId}-${userId}`,
      message_id: messageId,
      user_id: userId,
      emoji,
      created_at: existing?.created_at ?? new Date().toISOString(),
    },
  ];
}

export function mergeReactionFromRealtime(
  reactions: MessageReaction[],
  row: MessageReaction,
  event: "INSERT" | "UPDATE" | "DELETE"
): MessageReaction[] {
  const filtered = reactions.filter(
    (r) =>
      !(
        r.message_id === row.message_id &&
        (r.id === row.id || r.user_id === row.user_id)
      )
  );

  if (event === "DELETE") return filtered;

  return [...filtered, row];
}
