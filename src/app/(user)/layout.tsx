import { requireUser } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/actions/notifications";
import { getMyLikedIds } from "@/lib/actions/likes";
import { getUnreadMessageCount } from "@/lib/user/messages";
import { getUserMatches, countPendingMatchActions } from "@/lib/user/matches";
import { touchLastSeen } from "@/lib/actions/discover";
import { LastSeenHeartbeat } from "@/components/user/last-seen-heartbeat";
import { UserShell } from "@/components/user/user-shell";
import { UserContentArea } from "@/components/user/user-content-area";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireUser();
  const [unreadCount, likedIds] = await Promise.all([
    getUnreadCount(),
    getMyLikedIds(),
  ]);
  const unreadMessageCount = await getUnreadMessageCount(profile.id);
  const matches = await getUserMatches(profile.id);
  const pendingMatchCount = countPendingMatchActions(matches);
  await touchLastSeen();

  return (
    <>
      <LastSeenHeartbeat />
      <UserShell
        unreadCount={unreadCount}
        unreadMessageCount={unreadMessageCount}
        pendingMatchCount={pendingMatchCount}
        likedCount={likedIds.length}
        displayName={profile.display_name || undefined}
        avatarUrl={profile.primary_photo_url}
      >
        <UserContentArea>{children}</UserContentArea>
      </UserShell>
    </>
  );
}
