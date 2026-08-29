import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { getUserMatches } from "@/lib/user/matches";
import { getMyLikedIds } from "@/lib/actions/likes";
import { getMatchingCreditsStatus } from "@/lib/user/matching-credits";
import { MatchesList } from "@/components/user/matches-list";
import { PaymentRequiredBanner } from "@/components/user/profile-banners";
import { CheckoutReturnToast } from "@/components/user/checkout-return-toast";
import { MatchsPageSkeleton } from "@/components/layout/page-loading-skeletons";
import { PageHeader, PageStack } from "@/components/layout/page-header";

export const metadata = {
  title: "Mes matchs",
};

export default async function MatchsPage() {
  const profile = await requireUser();
  const [matches, matchingCredits, likedIds] = await Promise.all([
    getUserMatches(profile.id),
    getMatchingCreditsStatus(profile.id),
    getMyLikedIds(profile.id),
  ]);

  return (
    <PageStack>
      <Suspense fallback={null}>
        <CheckoutReturnToast />
      </Suspense>
      <PageHeader
        title="Mes matchs"
        description="Mises en relation proposées par notre équipe et suivi de vos rencontres."
      />
      <PaymentRequiredBanner profile={profile} />
      <Suspense
        fallback={<MatchsPageSkeleton />}
      >
        <MatchesList
          matches={matches}
          matchingCredits={matchingCredits}
          likesSent={likedIds.length}
          profileCompletion={profile.profile_completion ?? 0}
        />
      </Suspense>
    </PageStack>
  );
}
