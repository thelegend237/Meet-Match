import { createClient } from "@/lib/supabase/server";

/** Met à jour last_seen_at (appelable depuis les Server Components). */
export async function touchLastSeen(userId?: string) {
  const supabase = await createClient();
  let uid = userId;
  if (!uid) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    uid = user.id;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("last_seen_at")
    .eq("id", uid)
    .single();

  if (profile?.last_seen_at) {
    const elapsed = Date.now() - new Date(profile.last_seen_at).getTime();
    if (elapsed < 2 * 60 * 1000) return;
  }

  await supabase
    .from("profiles")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", uid);
}
