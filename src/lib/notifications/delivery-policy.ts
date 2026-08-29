/**
 * Politique de livraison : la plupart des notifications restent in-app (+ push optionnel).
 * Les emails sont réservés aux événements importants pour limiter le volume.
 */
export const EMAIL_NOTIFICATION_TYPES = new Set([
  /** Membre : quelqu'un a liké son profil */
  "like_received",
  /** Admin : nouvel inscrit */
  "admin_new_member",
  /** Admin : like (sens unique) à traiter */
  "admin_like_received",
  /** Admin : likes réciproques à traiter */
  "admin_mutual_like",
  /** Admin : demande de réactivation après match réussi */
  "admin_reactivation_requested",
]);

export function shouldSendNotificationEmail(type: string): boolean {
  return EMAIL_NOTIFICATION_TYPES.has(type);
}
