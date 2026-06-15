import { requireUser } from "@/lib/auth/session";
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

  return (
    <PageStack>
      <PageHeader
        title="Paramètres"
        description="Gérez votre compte, votre sécurité et vos préférences."
        backHref="/profil"
        backLabel="Profil"
      />
      <ProfileSettings profile={profile} fromReset={fromReset} />
    </PageStack>
  );
}
