"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";

function mapDeleteAccountError(message: string): string {
  if (message.includes("Cannot delete the last superadmin")) {
    return "Vous êtes le dernier super administrateur. Désignez un autre superadmin avant de supprimer votre compte.";
  }
  if (message.includes("User not found")) {
    return "Compte introuvable ou déjà supprimé.";
  }
  if (message.includes("Non authentifié") || message.includes("Unauthorized")) {
    return "Session expirée. Reconnectez-vous puis réessayez.";
  }
  return message;
}

export async function deleteOwnAccountAction() {
  const profile = await getCurrentProfile();
  if (!profile || profile.is_deleted || profile.status === "deleted") {
    return { error: "Session expirée. Reconnectez-vous puis réessayez." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("soft_delete_user", {
    p_user_id: profile.id,
  });

  if (error) {
    return { error: mapDeleteAccountError(error.message) };
  }

  await supabase.auth.signOut();
  return { success: true as const };
}
