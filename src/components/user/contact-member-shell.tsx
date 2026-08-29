import type { Profile } from "@/lib/types/database";
import { isDeactivatedAfterMatchSuccess } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/actions/notifications";
import { getMyLikedIds } from "@/lib/actions/likes";
import { getUnreadMessageCount } from "@/lib/user/messages";
import { getUserMatches, countPendingMatchActions } from "@/lib/user/matches";
import { touchLastSeen } from "@/lib/user/touch-last-seen";
import { LastSeenHeartbeat } from "@/components/user/last-seen-heartbeat";
import { UserShell } from "@/components/user/user-shell";
import { UserContentArea } from "@/components/user/user-content-area";

/** Shell membre allégé pour /contact — pas de requireUser (évite redirect si session instable). */
export async function ContactMemberShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const deactivatedAfterMatch = isDeactivatedAfterMatchSuccess(profile);
  let unreadCount = 0;
  let likedCount = 0;
  let unreadMessageCount = 0;
  let pendingMatchCount = 0;

  try {
    const [notifications, likedIds, messages, matches] = await Promise.all([
      getUnreadCount(profile.id),
      getMyLikedIds(profile.id),
      getUnreadMessageCount(profile.id),
      getUserMatches(profile.id),
    ]);
    unreadCount = notifications;
    likedCount = likedIds.length;
    unreadMessageCount = messages;
    pendingMatchCount = countPendingMatchActions(matches);
    void touchLastSeen(profile.id);
  } catch (err) {
    console.error("[ContactMemberShell] sidebar data:", err);
  }

  return (
    <>
      <LastSeenHeartbeat />
      <UserShell
        unreadCount={unreadCount}
        unreadMessageCount={unreadMessageCount}
        pendingMatchCount={pendingMatchCount}
        likedCount={likedCount}
        displayName={profile.display_name || undefined}
        avatarUrl={profile.primary_photo_url}
        profile={profile}
        deactivatedAfterMatch={deactivatedAfterMatch}
      >
        <UserContentArea>{children}</UserContentArea>
      </UserShell>
    </>
  );
}
