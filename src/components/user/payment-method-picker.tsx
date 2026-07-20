"use client";

import { useEffect, useState, useTransition } from "react";
import { CreditCard, Loader2, Smartphone, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listAvailablePaymentMethods } from "@/lib/actions/payments";
import type { PaymentMethodId } from "@/lib/payments/providers";
import { cn } from "@/lib/utils";

type MethodOption = {
  id: PaymentMethodId;
  label: string;
  description: string;
  provider: string;
};

function MethodIcon({ id }: { id: PaymentMethodId }) {
  if (id === "paypal") return <Wallet className="h-5 w-5" />;
  if (id === "mtn" || id === "orange") {
    return <Smartphone className="h-5 w-5" />;
  }
  return <CreditCard className="h-5 w-5" />;
}

interface PaymentMethodPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (method: PaymentMethodId) => void;
  title?: string;
  amountLabel?: string;
}

/**
 * Modal de choix du moyen de paiement.
 * N'affiche que les moyens configurés côté serveur.
 */
export function PaymentMethodPicker({
  open,
  onClose,
  onSelect,
  title = "Choisir un moyen de paiement",
  amountLabel,
}: PaymentMethodPickerProps) {
  const [methods, setMethods] = useState<MethodOption[] | null>(null);
  const [loading, startLoad] = useTransition();
  const [selected, setSelected] = useState<PaymentMethodId | null>(null);

  useEffect(() => {
    if (!open) return;
    startLoad(async () => {
      const list = await listAvailablePaymentMethods();
      setMethods(list);
      setSelected(list[0]?.id ?? null);
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40 safe-area-pt sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-method-title"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ebe6f0] px-4 py-3">
          <div>
            <h2
              id="payment-method-title"
              className="text-base font-bold text-[#2e1a47]"
            >
              {title}
            </h2>
            {amountLabel ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {amountLabel}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#9b8fa8] hover:bg-[#f3eef8]"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2 px-4 py-4">
          {loading && !methods ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !methods?.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Aucun moyen de paiement n&apos;est configuré pour le moment.
            </p>
          ) : (
            methods.map((method) => {
              const active = selected === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelected(method.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors",
                    active
                      ? "border-secondary bg-secondary/5"
                      : "border-[#ebe6f0] hover:border-secondary/40 hover:bg-[#faf8fc]"
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                      active
                        ? "bg-secondary text-secondary-foreground"
                        : "bg-[#f3eef8] text-[#5b3d8f]"
                    )}
                  >
                    <MethodIcon id={method.id} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-[#2e1a47]">
                      {method.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {method.description}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-[#ebe6f0] px-4 py-3">
          <Button
            variant="secondary"
            className="w-full"
            disabled={!selected || loading}
            onClick={() => {
              if (!selected) return;
              onSelect(selected);
            }}
          >
            Continuer
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Lance le checkout : si un seul moyen → direct ; sinon ouvre le picker.
 * Retourne true si le picker a été ouvert (pas encore de checkout).
 */
export async function resolvePaymentMethodForCheckout(
  onNeedPicker: () => void
): Promise<PaymentMethodId | null> {
  const methods = await listAvailablePaymentMethods();
  if (methods.length === 0) return null;
  if (methods.length === 1) return methods[0].id;
  onNeedPicker();
  return null;
}
