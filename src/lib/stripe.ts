import Stripe from "stripe";
import { PRICING_TEST_MODE } from "@/lib/pricing";

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/**
 * Checkout Stripe actif uniquement si :
 * - pas en mode test pricing
 * - clés présentes
 * - NEXT_PUBLIC_ENABLE_STRIPE=true (dating = activité restreinte Stripe)
 */
export function shouldUseStripeCheckout(): boolean {
  return (
    !PRICING_TEST_MODE &&
    isStripeConfigured() &&
    process.env.NEXT_PUBLIC_ENABLE_STRIPE === "true"
  );
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY manquante");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export function getAppUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (!url) return "http://localhost:3000";
  if (url.startsWith("http")) return url.replace(/\/$/, "");
  return `https://${url.replace(/\/$/, "")}`;
}

/** Montant Stripe en centimes. */
export function toStripeAmount(amount: number): number {
  return Math.round(amount * 100);
}
