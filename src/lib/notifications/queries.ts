import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/types/database";

export async function fetchUserNotifications(
  userId: string,
  limit = 50
): Promise<Notification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data as Notification[]) ?? [];
}

export async function fetchRecentNotifications(
  userId: string,
  limit = 5
): Promise<Notification[]> {
  return fetchUserNotifications(userId, limit);
}
