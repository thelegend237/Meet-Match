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
