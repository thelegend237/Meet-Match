import { requireUser, hasPlatformAccess } from "@/lib/auth/session";
import { isStaffProfile } from "@/lib/auth/staff";
import { getUnreadCount } from "@/lib/actions/notifications";
import { getMyLikedIds } from "@/lib/actions/likes";
import { getUnreadMessageCount } from "@/lib/user/messages";
import { getUserMatches, countPendingMatchActions } from "@/lib/user/matches";
import { touchLastSeen } from "@/lib/user/touch-last-seen";
import { LastSeenHeartbeat } from "@/components/user/last-seen-heartbeat";
import { UserShell } from "@/components/user/user-shell";
import { UserContentArea } from "@/components/user/user-content-area";

export async function MemberChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireUser();
  const welcomeTourEligible =
    profile.role === "user" && hasPlatformAccess(profile);

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
    console.error("[MemberChrome] sidebar data:", err);
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
        welcomeTourEligible={welcomeTourEligible}
        showAdminLink={isStaffProfile(profile)}
      >
        <UserContentArea>{children}</UserContentArea>
      </UserShell>
    </>
  );
}
