import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PaymentsView } from "@/components/user/payments-view";
import { PageHeader, PageStack } from "@/components/layout/page-header";
import type { Payment } from "@/lib/types/database";

export const metadata = {
  title: "Paiements",
};

export default async function PaiementsPage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <PageStack>
      <PageHeader
        title="Paiements"
        description="Comprenez nos tarifs, activez votre compte et suivez chaque étape vers une mise en relation accompagnée."
      />
      <PaymentsView
        profile={profile}
        payments={(payments as Payment[]) ?? []}
      />
    </PageStack>
  );
}
