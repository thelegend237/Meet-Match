import { Suspense } from "react";
import { requireActiveMember } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getMatchingCreditsStatus } from "@/lib/user/matching-credits";
import { PaymentsView } from "@/components/user/payments-view";
import { CheckoutReturnToast } from "@/components/user/checkout-return-toast";
import { PageHeader, PageStack } from "@/components/layout/page-header";
import type { Payment } from "@/lib/types/database";

export const metadata = {
  title: "Paiements",
};

export default async function PaiementsPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string; checkout?: string }>;
}) {
  const profile = await requireActiveMember();
  const params = await searchParams;
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const matchingCredits = await getMatchingCreditsStatus(profile.id);
  const showWelcome = params.welcome === "1";

  return (
    <PageStack>
      <Suspense fallback={null}>
        <CheckoutReturnToast />
      </Suspense>
      <PageHeader
        title="Paiements"
        description="Comprenez nos tarifs, activez votre compte et suivez chaque étape vers une mise en relation accompagnée."
      />
      <PaymentsView
        profile={profile}
        payments={(payments as Payment[]) ?? []}
        matchingCredits={matchingCredits}
        showWelcome={showWelcome}
      />
    </PageStack>
  );
}
