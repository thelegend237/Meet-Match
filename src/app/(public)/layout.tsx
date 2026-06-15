import { PublicShell } from "@/components/public/public-shell";
import { getCurrentProfile } from "@/lib/auth/session";
import { getHomeForRole } from "@/lib/auth/routes";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  return (
    <PublicShell
      isAuthenticated={Boolean(profile)}
      homeHref={profile ? getHomeForRole(profile.role) : undefined}
      displayName={profile?.display_name}
    >
      {children}
    </PublicShell>
  );
}
