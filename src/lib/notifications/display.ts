import type { Notification } from "@/lib/types/database";

const MATCH_TYPES = new Set([
  "match_proposed",
  "matching_payment_required",
  "match_success",
  "match_failed",
]);

const ADMIN_TYPES = new Set([
  "admin_new_member",
  "admin_mutual_like",
  "admin_registration_unpaid",
  "admin_match_pending",
]);

export function isAdminNotificationType(type: string): boolean {
  return ADMIN_TYPES.has(type) || type === "chat_opened";
}

/** Lien interne selon le type et les métadonnées. */
export function getNotificationHref(
  notification: Notification,
  options?: { isAdmin?: boolean }
): string | null {
  const meta = notification.metadata ?? {};
  const isAdmin = options?.isAdmin ?? false;

  if (notification.type === "chat_opened") {
    const chatId = meta.chat_id;
    if (typeof chatId === "string") {
      return isAdmin
        ? `/admin/conversations/${chatId}`
        : `/messages/${chatId}`;
    }
  }

  if (notification.type === "admin_new_member" || notification.type === "admin_registration_unpaid") {
    const userId = meta.user_id;
    if (typeof userId === "string") return `/admin/utilisateurs/${userId}`;
  }

  if (notification.type === "admin_mutual_like") {
    const userA = meta.user_a_id;
    if (typeof userA === "string") return `/admin/matchs?tab=proposer&user=${userA}`;
    return "/admin/matchs?tab=proposer";
  }

  if (notification.type === "admin_match_pending") {
    const matchId = meta.match_id;
    if (typeof matchId === "string") return `/admin/matchs`;
    return "/admin/matchs";
  }

  if (notification.type === "like_received") {
    return "/decouvrir/likes";
  }

  if (notification.type === "account_created" || notification.type === "profile_incomplete") {
    return "/profil/modifier";
  }

  if (notification.type === "payment_confirmed") {
    const paymentType = meta.payment_type;
    if (paymentType === "matching") return "/matchs";
    return "/paiements";
  }

  if (MATCH_TYPES.has(notification.type)) {
    const matchId = meta.match_id;
    if (typeof matchId === "string") return `/matchs?match=${matchId}`;
    return "/matchs";
  }

  if (notification.type === "account_deleted") return null;

  return null;
}

export function getNotificationActionLabel(
  notification: Notification,
  options?: { isAdmin?: boolean }
): string | null {
  const href = getNotificationHref(notification, options);
  if (!href) return null;

  switch (notification.type) {
    case "chat_opened":
      return href.startsWith("/admin") ? "Ouvrir la discussion →" : "Ouvrir la conversation →";
    case "like_received":
      return "Voir mes likes →";
    case "account_created":
    case "profile_incomplete":
      return "Compléter mon profil →";
    case "payment_confirmed":
      return "Voir les détails →";
    case "admin_new_member":
    case "admin_registration_unpaid":
      return "Voir le profil →";
    case "admin_mutual_like":
      return "Comparer les profils →";
    case "admin_match_pending":
      return "Suivre le match →";
    default:
      if (MATCH_TYPES.has(notification.type)) return "Voir le match →";
      return "Voir →";
  }
}

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  account_created: "Bienvenue",
  profile_incomplete: "Profil",
  like_received: "Like",
  like_sent: "Like",
  match_proposed: "Match",
  matching_payment_required: "Paiement",
  payment_confirmed: "Paiement",
  chat_opened: "Discussion",
  match_success: "Match réussi",
  match_failed: "Match",
  account_deleted: "Compte",
  admin_new_member: "Nouveau membre",
  admin_mutual_like: "Like réciproque",
  admin_registration_unpaid: "Inscription",
  admin_match_pending: "Match en attente",
};
