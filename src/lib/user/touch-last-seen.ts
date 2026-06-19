import { createClient } from "@/lib/supabase/server";

/** Met à jour last_seen_at (appelable depuis les Server Components). */
export async function touchLastSeen() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("last_seen_at")
    .eq("id", user.id)
    .single();

  if (profile?.last_seen_at) {
    const elapsed = Date.now() - new Date(profile.last_seen_at).getTime();
    if (elapsed < 2 * 60 * 1000) return;
  }

  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", user.id);
}
