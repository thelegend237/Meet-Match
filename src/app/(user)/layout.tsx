import { requireUser } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/actions/notifications";
import { getUnreadMessageCount } from "@/lib/user/messages";
import { getUserMatches, countPendingMatchActions } from "@/lib/user/matches";
import { touchLastSeen } from "@/lib/actions/discover";
import { UserShell } from "@/components/user/user-shell";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireUser();
  const unreadCount = await getUnreadCount();
  const unreadMessageCount = await getUnreadMessageCount(profile.id);
  const matches = await getUserMatches(profile.id);
  const pendingMatchCount = countPendingMatchActions(matches);
  await touchLastSeen();

  return (
    <UserShell
      unreadCount={unreadCount}
      unreadMessageCount={unreadMessageCount}
      pendingMatchCount={pendingMatchCount}
      displayName={profile.display_name || undefined}
    >
      <div className="w-full px-4 py-4 sm:px-6 sm:py-6 xl:max-w-5xl xl:px-8 xl:py-8">
        {children}
      </div>
    </UserShell>
  );
}
