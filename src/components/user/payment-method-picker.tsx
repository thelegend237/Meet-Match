"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Check,
  CreditCard,
  Loader2,
  Lock,
  Smartphone,
  Wallet,
  X,
} from "lucide-react";
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

const METHOD_VISUAL: Record<
  PaymentMethodId,
  {
    icon: typeof CreditCard;
    accent: string;
    iconBg: string;
    iconFg: string;
    ring: string;
    selectedBg: string;
  }
> = {
  stripe: {
    icon: CreditCard,
    accent: "from-[#635bff]/15 to-[#0a2540]/5",
    iconBg: "bg-[#635bff]",
    iconFg: "text-white",
    ring: "ring-[#635bff]/35",
    selectedBg: "bg-[#635bff]/[0.06]",
  },
  paypal: {
    icon: Wallet,
    accent: "from-[#0070ba]/15 to-[#003087]/5",
    iconBg: "bg-[#0070ba]",
    iconFg: "text-white",
    ring: "ring-[#0070ba]/35",
    selectedBg: "bg-[#0070ba]/[0.06]",
  },
  mtn: {
    icon: Smartphone,
    accent: "from-[#ffcc00]/25 to-[#ffcc00]/5",
    iconBg: "bg-[#ffcc00]",
    iconFg: "text-[#1a1a1a]",
    ring: "ring-[#ffcc00]/50",
    selectedBg: "bg-[#ffcc00]/10",
  },
  orange: {
    icon: Smartphone,
    accent: "from-[#ff7900]/20 to-[#ff7900]/5",
    iconBg: "bg-[#ff7900]",
    iconFg: "text-white",
    ring: "ring-[#ff7900]/40",
    selectedBg: "bg-[#ff7900]/[0.07]",
  },
};

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
  title = "Paiement sécurisé",
  amountLabel,
}: PaymentMethodPickerProps) {
  const [methods, setMethods] = useState<MethodOption[] | null>(null);
  const [loading, startLoad] = useTransition();
  const [selected, setSelected] = useState<PaymentMethodId | null>(null);
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntering(false);
      return;
    }
    const id = requestAnimationFrame(() => setEntering(true));
    startLoad(async () => {
      const list = await listAvailablePaymentMethods();
      setMethods(list);
      setSelected(list[0]?.id ?? null);
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const selectedMethod = methods?.find((m) => m.id === selected);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[80] flex items-end justify-center safe-area-pt sm:items-center sm:p-5",
        "transition-colors duration-300",
        entering ? "bg-[#2e1a47]/45 backdrop-blur-[6px]" : "bg-[#2e1a47]/0"
      )}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payment-method-title"
    >
      <div
        className={cn(
          "relative w-full max-w-[420px] overflow-hidden rounded-t-[1.75rem] bg-white shadow-[0_-12px_48px_rgba(46,26,71,0.18)] sm:rounded-[1.75rem] sm:shadow-[0_24px_64px_rgba(46,26,71,0.22)]",
          "transition-all duration-300 ease-out",
          entering
            ? "translate-y-0 opacity-100 sm:scale-100"
            : "translate-y-8 opacity-0 sm:translate-y-4 sm:scale-[0.97]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Atmosphere */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#fce8f3]/80 via-[#f8f6fc] to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-secondary/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-8 top-16 h-28 w-28 rounded-full bg-primary/10 blur-3xl"
        />

        {/* Handle (mobile) */}
        <div className="relative flex justify-center pt-3 sm:hidden">
          <span className="h-1 w-10 rounded-full bg-[#e8e0f0]" />
        </div>

        {/* Header */}
        <div className="relative px-5 pb-2 pt-3 sm:pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">
                Meet &amp; Match
              </p>
              <h2
                id="payment-method-title"
                className="mt-1 font-brand text-2xl leading-tight text-primary"
              >
                {title}
              </h2>
              {amountLabel ? (
                <p className="mt-2 inline-flex items-baseline gap-1.5 rounded-full bg-white/80 px-3 py-1 text-sm shadow-sm ring-1 ring-[#e8e0f0]">
                  <span className="text-muted-foreground">Montant</span>
                  <span className="font-semibold text-primary">{amountLabel}</span>
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-[#9b8fa8] shadow-sm ring-1 ring-[#ebe6f0] transition hover:bg-[#f3eef8] hover:text-primary"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Choisissez comment vous souhaitez régler.
          </p>
        </div>

        {/* Methods */}
        <div className="relative space-y-2.5 px-5 py-4">
          {loading && !methods ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-secondary" />
              <span className="text-xs">Chargement des moyens…</span>
            </div>
          ) : !methods?.length ? (
            <p className="rounded-2xl bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground">
              Aucun moyen de paiement n&apos;est configuré pour le moment.
            </p>
          ) : (
            methods.map((method, index) => {
              const active = selected === method.id;
              const visual = METHOD_VISUAL[method.id];
              const Icon = visual.icon;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelected(method.id)}
                  onDoubleClick={() => onSelect(method.id)}
                  className={cn(
                    "group relative flex w-full items-center gap-3.5 overflow-hidden rounded-2xl px-3.5 py-3.5 text-left",
                    "ring-1 transition-all duration-200 mm-motion-card-enter",
                    index === 1 && "[animation-delay:45ms]",
                    index === 2 && "[animation-delay:90ms]",
                    index === 3 && "[animation-delay:135ms]",
                    active
                      ? cn(
                          "ring-2 shadow-[0_8px_24px_rgba(46,26,71,0.08)]",
                          visual.ring,
                          visual.selectedBg
                        )
                      : "ring-[#ebe6f0] bg-white hover:ring-[#d9cfe6] hover:bg-[#faf8fc]"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-0 opacity-0 transition-opacity duration-200",
                      `bg-gradient-to-r ${visual.accent}`,
                      active && "opacity-100"
                    )}
                  />
                  <span
                    className={cn(
                      "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-200",
                      visual.iconBg,
                      visual.iconFg,
                      active && "scale-105"
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={2.25} />
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold text-primary">
                      {method.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                      {method.description}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-200",
                      active
                        ? "bg-secondary text-white scale-100"
                        : "scale-90 ring-1 ring-[#e0d6eb] bg-white"
                    )}
                    aria-hidden
                  >
                    {active ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="relative space-y-3 border-t border-[#f0ebf5] bg-gradient-to-t from-[#faf8fc] to-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <Button
            variant="gradient"
            size="lg"
            className="w-full h-12 text-[15px] font-semibold shadow-lg shadow-secondary/20"
            disabled={!selected || loading}
            onClick={() => {
              if (!selected) return;
              onSelect(selected);
            }}
          >
            {selectedMethod
              ? `Continuer avec ${shortLabel(selectedMethod.id)}`
              : "Continuer"}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3" />
            Paiement chiffré · vous serez redirigé de façon sécurisée
          </p>
        </div>
      </div>
    </div>
  );
}

function shortLabel(id: PaymentMethodId): string {
  switch (id) {
    case "stripe":
      return "la carte";
    case "paypal":
      return "PayPal";
    case "mtn":
      return "MTN MoMo";
    case "orange":
      return "Orange Money";
  }
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
