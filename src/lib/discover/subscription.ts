/** Message renvoyé par les actions serveur quand l'abonnement est requis. */
export const SUBSCRIPTION_REQUIRED_ERROR =
  "Activez votre abonnement pour liker et interagir avec les profils.";

export function isSubscriptionRequiredError(error?: string | null): boolean {
  return error === SUBSCRIPTION_REQUIRED_ERROR;
}
