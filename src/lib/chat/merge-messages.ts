import type { ChatMessage } from "@/lib/types/database";

/** Fusionne les messages serveur avec l'état client sans perdre réactions optimistes. */
export function mergeChatMessages(
  prev: ChatMessage[],
  server: ChatMessage[]
): ChatMessage[] {
  if (!server.length) return prev.length ? prev : server;

  const prevById = new Map(prev.map((m) => [m.id, m]));
  const serverIds = new Set(server.map((m) => m.id));

  const merged = server.map((message) => {
    const local = prevById.get(message.id);
    if (!local) return message;

    const localReactions = local.reactions ?? [];
    const serverReactions = message.reactions ?? [];

    return {
      ...message,
      reactions:
        serverReactions.length >= localReactions.length
          ? serverReactions
          : localReactions,
    };
  });

  const optimisticOnly = prev.filter((m) => !serverIds.has(m.id));
  return [...merged, ...optimisticOnly];
}
