"use client";

import { useState, useTransition } from "react";
import { CreditCard, FlaskConical, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  PaymentMethodPicker,
  resolvePaymentMethodForCheckout,
} from "@/components/user/payment-method-picker";
import {
  startStaffPaymentTestCheckout,
  type StaffPaymentTestType,
} from "@/lib/actions/payments";
import type { PaymentMethodId } from "@/lib/payments/providers";
import {
  formatDisplayPrice,
  formatStaffPaymentTestPriceRange,
  getStaffPaymentTestFee,
} from "@/lib/pricing";
import { toast } from "@/hooks/use-toast";

export function StaffPaymentTestPanel() {
  const [pending, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingType, setPendingType] = useState<StaffPaymentTestType | null>(
    null
  );
  const { confirm, dialog } = useConfirm();

  const priceRange = formatStaffPaymentTestPriceRange();
  const regLabel = formatDisplayPrice(
    getStaffPaymentTestFee("registration").amount,
    "USD"
  );
  const matchLabel = formatDisplayPrice(
    getStaffPaymentTestFee("matching").amount,
    "USD"
  );

  function runCheckout(type: StaffPaymentTestType, method?: PaymentMethodId) {
    startTransition(async () => {
      const result = await startStaffPaymentTestCheckout(
        type,
        method ? { method } : undefined
      );
      if ("error" in result && result.error) {
        toast({
          variant: "destructive",
          title: "Test paiement",
          description: result.error,
        });
        return;
      }
      if ("url" in result && result.url) {
        window.location.assign(result.url);
        return;
      }
      toast({
        variant: "destructive",
        title: "Test paiement",
        description: "Aucune URL de checkout renvoyée.",
      });
    });
  }

  async function handleTest(type: StaffPaymentTestType) {
    const confirmed = await confirm({
      title: "Lancer un paiement de test ?",
      description: `Type : ${type === "registration" ? "inscription" : "matching"} (montant minimal : ${priceRange}). Vous serez redirigé vers Stripe, PayPal ou ViaziPay.`,
      confirmLabel: "Continuer",
    });
    if (!confirmed) return;

    startTransition(async () => {
      const method = await resolvePaymentMethodForCheckout(() => {
        setPendingType(type);
        setPickerOpen(true);
      });
      if (method) {
        runCheckout(type, method);
      }
    });
  }

  return (
    <>
      {dialog}
      <section className="rounded-2xl border border-dashed border-amber-300/80 bg-gradient-to-br from-amber-50/90 via-white to-[#fff7ed] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <FlaskConical className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/80">
              Réservé à l&apos;équipe
            </p>
            <h2 className="mt-0.5 font-sans text-lg font-bold text-amber-950">
              Tester les formulaires de paiement
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-amber-900/85">
              Ignore l&apos;offre de lancement et ouvre un vrai checkout au
              montant minimal ({priceRange} selon le moyen). Utile pour valider
              PayPal / ViaziPay sans payer les tarifs réels.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                className="w-full sm:w-auto"
                onClick={() => handleTest("registration")}
              >
                {pending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Test inscription (dès {regLabel})
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                className="w-full border-amber-300 bg-white sm:w-auto"
                onClick={() => handleTest("matching")}
              >
                {pending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Smartphone className="mr-2 h-4 w-4" />
                )}
                Test matching (dès {matchLabel})
              </Button>
            </div>
          </div>
        </div>
      </section>

      <PaymentMethodPicker
        open={pickerOpen}
        title="Moyen de paiement (test admin)"
        amountLabel={priceRange}
        onClose={() => {
          setPickerOpen(false);
          setPendingType(null);
        }}
        onSelect={(method) => {
          const type = pendingType ?? "registration";
          setPickerOpen(false);
          setPendingType(null);
          runCheckout(type, method);
        }}
      />
    </>
  );
}
