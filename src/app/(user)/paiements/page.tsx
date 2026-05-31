import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { PaymentsView } from "@/components/user/payments-view";
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
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-2xl font-bold text-primary sm:text-3xl">
          Paiements
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Comprenez nos tarifs, activez votre compte et suivez chaque étape vers une
          mise en relation accompagnée.
        </p>
      </header>
      <PaymentsView
        profile={profile}
        payments={(payments as Payment[]) ?? []}
      />
    </div>
  );
}
