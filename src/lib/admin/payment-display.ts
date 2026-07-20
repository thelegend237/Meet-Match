import { paymentStatusLabels } from "@/lib/admin/labels";
import { isFreeFee } from "@/lib/pricing";
import type { Payment, PaymentStatus, PaymentType } from "@/lib/types/database";

/** Libellé admin / membre pour éviter « Impayé · 0 $ » ambigu en phase test. */
export function getPaymentStatusLabel(
  status: PaymentStatus,
  options?: { type?: PaymentType; amount?: number }
): string {
  const amount = options?.amount ?? 0;
  if (
    status === "unpaid" &&
    options?.type === "registration" &&
    isFreeFee(amount)
  ) {
    return "Activation requise";
  }
  return paymentStatusLabels[status] ?? status;
}

export function getPaymentRowStatusLabel(payment: Pick<Payment, "status" | "type" | "amount">) {
  return getPaymentStatusLabel(payment.status, {
    type: payment.type,
    amount: Number(payment.amount),
  });
}

const PROVIDER_LABELS: Record<string, string> = {
  stripe: "Carte / Apple Pay",
  paypal: "PayPal",
  cinetpay: "MTN / Orange",
  flutterwave: "Flutterwave",
  manual: "Manuel",
};

/** Libellé du moyen de paiement pour l’admin. */
export function getPaymentProviderLabel(provider: string | null | undefined): string {
  if (!provider) return "—";
  return PROVIDER_LABELS[provider] ?? provider;
}

export function getPaymentProviderBadgeClass(provider: string | null | undefined): string {
  switch (provider) {
    case "stripe":
      return "bg-[#ede9fe] text-[#4c1d95]";
    case "paypal":
      return "bg-[#dbeafe] text-[#1e40af]";
    case "cinetpay":
      return "bg-[#ffedd5] text-[#c2410c]";
    case "manual":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}
