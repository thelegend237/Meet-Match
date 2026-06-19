import type { Profile } from "@/lib/types/database";
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
  let unreadCount = 0;
  let likedCount = 0;
  let unreadMessageCount = 0;
  let pendingMatchCount = 0;

  try {
    const [notifications, likedIds] = await Promise.all([
      getUnreadCount(),
      getMyLikedIds(),
    ]);
    unreadCount = notifications;
    likedCount = likedIds.length;
    unreadMessageCount = await getUnreadMessageCount(profile.id);
    const matches = await getUserMatches(profile.id);
    pendingMatchCount = countPendingMatchActions(matches);
    await touchLastSeen();
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
      >
        <UserContentArea>{children}</UserContentArea>
      </UserShell>
    </>
  );
}
