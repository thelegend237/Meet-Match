import {
  requireUser,
  canBrowseDiscovery,
  isDeactivatedAfterMatchSuccess,
} from "@/lib/auth/session";
import { isStaffProfile } from "@/lib/auth/staff";
import { getUnreadCount } from "@/lib/actions/notifications";
import { getMyLikedCount } from "@/lib/actions/likes";
import { getUnreadMessageCount } from "@/lib/user/messages";
import { getPendingMatchActionCount } from "@/lib/user/matches";
import { touchLastSeen } from "@/lib/user/touch-last-seen";
import { LastSeenHeartbeat } from "@/components/user/last-seen-heartbeat";
import { NotificationRealtimeProvider } from "@/components/user/notification-realtime-provider";
import { PushBootstrap } from "@/components/user/push-bootstrap";
import { UserShell } from "@/components/user/user-shell";
import { UserContentArea } from "@/components/user/user-content-area";

export async function MemberChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireUser();
  // Après 058 : statut profil suffit (pas de RPC à chaque navigation).
  const deactivatedAfterMatch = isDeactivatedAfterMatchSuccess(profile);
  const welcomeTourEligible =
    profile.role === "user" &&
    canBrowseDiscovery(profile) &&
    !deactivatedAfterMatch;

  let unreadCount = 0;
  let likedCount = 0;
  let unreadMessageCount = 0;
  let pendingMatchCount = 0;

  try {
    const [notifications, likes, messages, pendingMatches] = await Promise.all([
      getUnreadCount(profile.id),
      getMyLikedCount(profile.id),
      getUnreadMessageCount(profile.id),
      getPendingMatchActionCount(profile.id),
    ]);
    unreadCount = notifications;
    likedCount = likes;
    unreadMessageCount = messages;
    pendingMatchCount = pendingMatches;
    void touchLastSeen(profile.id);
  } catch (err) {
    console.error("[MemberChrome] sidebar data:", err);
  }

  return (
    <>
      <LastSeenHeartbeat />
      <PushBootstrap />
      <NotificationRealtimeProvider
        userId={profile.id}
        initialUnreadCount={unreadCount}
        isAdmin={isStaffProfile(profile)}
      >
        <UserShell
          unreadCount={unreadCount}
          unreadMessageCount={unreadMessageCount}
          pendingMatchCount={pendingMatchCount}
          likedCount={likedCount}
          displayName={profile.display_name || undefined}
          avatarUrl={profile.primary_photo_url}
          welcomeTourEligible={welcomeTourEligible}
          showAdminLink={isStaffProfile(profile)}
          notifyPush={profile.notify_push ?? true}
          profile={profile}
          deactivatedAfterMatch={deactivatedAfterMatch}
        >
          <UserContentArea>{children}</UserContentArea>
        </UserShell>
      </NotificationRealtimeProvider>
    </>
  );
}
