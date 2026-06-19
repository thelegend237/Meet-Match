import type { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types/database";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export function hasDiscoveryPhoto(
  profile: Pick<Profile, "primary_photo_url">
): boolean {
  return !!profile.primary_photo_url?.trim();
}

/** Photo en colonne ou au moins une entrée dans profile_photos. */
export async function viewerHasDiscoveryPhoto(
  supabase: SupabaseServer,
  userId: string,
  profile?: Pick<Profile, "primary_photo_url">
): Promise<boolean> {
  if (profile && hasDiscoveryPhoto(profile)) return true;

  const { count, error } = await supabase
    .from("profile_photos")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", userId);

  if (error) {
    console.error("[discover] profile_photos count:", error.message);
    return hasDiscoveryPhoto(profile ?? { primary_photo_url: null });
  }

  return (count ?? 0) > 0;
}
