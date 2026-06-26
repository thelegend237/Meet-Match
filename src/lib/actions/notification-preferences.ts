"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  notifyEmail: z.boolean(),
  notifyPush: z.boolean(),
});

export async function updateNotificationPreferences(input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "Données invalides" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase
    .from("profiles")
    .update({
      notify_email: parsed.data.notifyEmail,
      notify_push: parsed.data.notifyPush,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/notifications");
  revalidatePath("/profil/parametres");
  return { success: true };
}

export async function getNotificationPreferences() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("notify_email, notify_push")
    .eq("id", user.id)
    .maybeSingle();

  return data as { notify_email: boolean; notify_push: boolean } | null;
}
