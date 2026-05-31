import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getUserMatches } from "@/lib/user/matches";
import { ProfileHub } from "@/components/user/profile-hub";
import type { Payment } from "@/lib/types/database";

export const metadata = {
  title: "Profil",
};

export default async function ProfilPage() {
  const profile = await requireUser();
  const supabase = await createClient();

  const [{ data: payments, error: paymentsError }, matches] = await Promise.all([
    supabase
      .from("payments")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false }),
    getUserMatches(profile.id),
  ]);

  if (paymentsError) {
    console.error("[profil] payments fetch:", paymentsError.message);
  }

  return (
    <ProfileHub
      profile={profile}
      payments={paymentsError ? [] : ((payments as Payment[]) ?? [])}
      matchCount={matches.length}
    />
  );
}
