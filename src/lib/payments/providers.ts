import { isStripeConfigured } from "@/lib/stripe";

/** Provider stocké en DB (`payments.provider`). */
export type PaymentProvider =
  | "stripe"
  | "paypal"
  | "viazipay"
  | "cinetpay"
  | "manual";

/**
 * Moyen affiché dans l'UI.
 * MTN et Orange passent tous deux par ViaziPay.
 */
export type PaymentMethodId = "stripe" | "paypal" | "mtn" | "orange";

export interface PaymentMethodOption {
  id: PaymentMethodId;
  provider: PaymentProvider;
  label: string;
  description: string;
}

const METHOD_CATALOG: Record<PaymentMethodId, PaymentMethodOption> = {
  stripe: {
    id: "stripe",
    provider: "stripe",
    label: "Carte / Apple Pay (Stripe)",
    description: "Visa, Mastercard, Apple Pay, Google Pay",
  },
  paypal: {
    id: "paypal",
    provider: "paypal",
    label: "PayPal",
    description: "Compte PayPal ou carte via PayPal",
  },
  mtn: {
    id: "mtn",
    provider: "viazipay",
    label: "MTN MoMo",
    description: "Mobile Money MTN (Cameroun · ViaziPay)",
  },
  orange: {
    id: "orange",
    provider: "viazipay",
    label: "Orange Money",
    description: "Mobile Money Orange (Cameroun · ViaziPay)",
  },
};

/**
 * Stripe est masqué par défaut : les services de rencontre sont une
 * activité restreinte Stripe. Réactivation volontaire uniquement :
 * NEXT_PUBLIC_ENABLE_STRIPE=true (+ clés Stripe présentes).
 */
export function isStripeEnabledForCheckout(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENABLE_STRIPE === "true" && isStripeConfigured()
  );
}

export function isPayPalConfigured(): boolean {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID?.trim() &&
      process.env.PAYPAL_CLIENT_SECRET?.trim()
  );
}

export function isViaziPayConfigured(): boolean {
  return Boolean(
    process.env.VIAZIPAY_PUBLIC_KEY?.trim() &&
      process.env.VIAZIPAY_PRIVATE_KEY?.trim()
  );
}

export function paymentMethodToProvider(
  method: PaymentMethodId
): PaymentProvider {
  return METHOD_CATALOG[method].provider;
}

/**
 * Moyens de paiement réellement configurés (ordre d'affichage).
 * Ordre : PayPal → MTN → Orange → (Stripe si réactivé explicitement).
 */
export function getConfiguredPaymentMethods(): PaymentMethodOption[] {
  const methods: PaymentMethodOption[] = [];

  if (isPayPalConfigured()) methods.push(METHOD_CATALOG.paypal);
  if (isViaziPayConfigured()) {
    methods.push(METHOD_CATALOG.mtn, METHOD_CATALOG.orange);
  }
  if (isStripeEnabledForCheckout()) methods.push(METHOD_CATALOG.stripe);

  return methods;
}

export function isPaymentMethodConfigured(method: PaymentMethodId): boolean {
  return getConfiguredPaymentMethods().some((m) => m.id === method);
}

/** Au moins un provider de paiement réel est disponible. */
export function hasAnyPaymentProvider(): boolean {
  return getConfiguredPaymentMethods().length > 0;
}

/**
 * Moyen par défaut : premier de la liste configurée (PayPal en priorité).
 */
export function getDefaultPaymentMethod(): PaymentMethodId | null {
  const methods = getConfiguredPaymentMethods();
  return methods[0]?.id ?? null;
}

export function resolveCheckoutMethod(
  requested?: PaymentMethodId | null
): PaymentMethodId | null {
  if (requested && isPaymentMethodConfigured(requested)) {
    return requested;
  }
  return getDefaultPaymentMethod();
}
