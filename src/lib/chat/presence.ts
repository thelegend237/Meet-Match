export interface ChatPresencePayload {
  user_id: string;
  name: string;
  photo: string | null;
  is_admin: boolean;
  joined_at: string;
}

export interface ChatPresenceUser {
  userId: string;
  name: string;
  photo: string | null;
  isAdmin: boolean;
  joinedAt: string;
}

type PresenceState = Record<string, ChatPresencePayload[]>;

export function parseChatPresenceState(state: PresenceState): ChatPresenceUser[] {
  const byUserId = new Map<string, ChatPresenceUser>();

  for (const presences of Object.values(state)) {
    for (const raw of presences) {
      if (!raw?.user_id) continue;
      const existing = byUserId.get(raw.user_id);
      const joinedAt = raw.joined_at ?? new Date().toISOString();
      if (!existing || joinedAt > existing.joinedAt) {
        byUserId.set(raw.user_id, {
          userId: raw.user_id,
          name: raw.name,
          photo: raw.photo ?? null,
          isAdmin: Boolean(raw.is_admin),
          joinedAt,
        });
      }
    }
  }

  return [...byUserId.values()].sort((a, b) => {
    if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
    return a.name.localeCompare(b.name, "fr");
  });
}

export function sortPresentParticipants<
  T extends { id: string; isAdmin: boolean; isSelf: boolean; name: string },
>(participants: T[]): T[] {
  return [...participants].sort((a, b) => {
    if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
    if (a.isSelf !== b.isSelf) return a.isSelf ? -1 : 1;
    return a.name.localeCompare(b.name, "fr");
  });
}
