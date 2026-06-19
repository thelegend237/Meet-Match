import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { viewerHasDiscoveryPhoto } from "@/lib/discover/eligibility";
import { ProfileSettings } from "@/components/user/profile-settings";
import { PageHeader, PageStack } from "@/components/layout/page-header";

export const metadata = {
  title: "Paramètres",
};

interface PageProps {
  searchParams: Promise<{ reset?: string }>;
}

export default async function ParametresPage({ searchParams }: PageProps) {
  const profile = await requireUser();
  const { reset } = await searchParams;
  const fromReset = reset === "1";

  const supabase = await createClient();
  const hasPhoto = await viewerHasDiscoveryPhoto(supabase, profile.id, profile);

  return (
    <PageStack className="gap-3">
      <PageHeader
        title="Paramètres"
        description="Compte, sécurité, confidentialité et préférences."
        backHref="/profil"
        backLabel="Profil"
        className="space-y-0.5"
      />
      <ProfileSettings
        profile={profile}
        fromReset={fromReset}
        hasPhoto={hasPhoto}
      />
    </PageStack>
  );
}
