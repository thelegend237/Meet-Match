import { isStripeConfigured } from "@/lib/stripe";

/** Provider stocké en DB (`payments.provider`). */
export type PaymentProvider = "stripe" | "paypal" | "cinetpay" | "manual";

/**
 * Moyen affiché dans l'UI.
 * MTN et Orange passent tous deux par CinetPay.
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
    provider: "cinetpay",
    label: "MTN MoMo",
    description: "Mobile Money MTN (Afrique francophone)",
  },
  orange: {
    id: "orange",
    provider: "cinetpay",
    label: "Orange Money",
    description: "Mobile Money Orange (Afrique francophone)",
  },
};

export function isPayPalConfigured(): boolean {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID?.trim() &&
      process.env.PAYPAL_CLIENT_SECRET?.trim()
  );
}

export function isCinetPayConfigured(): boolean {
  return Boolean(
    process.env.CINETPAY_API_KEY?.trim() &&
      process.env.CINETPAY_SITE_ID?.trim()
  );
}

export function paymentMethodToProvider(
  method: PaymentMethodId
): PaymentProvider {
  return METHOD_CATALOG[method].provider;
}

/** Moyens de paiement réellement configurés (ordre d'affichage). */
export function getConfiguredPaymentMethods(): PaymentMethodOption[] {
  const methods: PaymentMethodOption[] = [];
  if (isStripeConfigured()) methods.push(METHOD_CATALOG.stripe);
  if (isPayPalConfigured()) methods.push(METHOD_CATALOG.paypal);
  if (isCinetPayConfigured()) {
    methods.push(METHOD_CATALOG.mtn, METHOD_CATALOG.orange);
  }
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
 * Provider DB par défaut quand un seul moyen (ou Stripe en priorité).
 * Utilisé si l'appelant n'en précise pas.
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
