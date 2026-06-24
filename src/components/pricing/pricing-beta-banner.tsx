import { Sparkles } from "lucide-react";
import {
  PRICING_BETA_DESCRIPTION,
  PRICING_BETA_TITLE,
  PRICING_TEST_MODE,
} from "@/lib/pricing";
import { cn } from "@/lib/utils";

export function PricingBetaBanner({
  className,
  compact,
}: {
  className?: string;
  compact?: boolean;
}) {
  if (!PRICING_TEST_MODE) return null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/95 via-white to-[#f0fdf4]",
        compact ? "p-4" : "p-5 sm:p-6",
        className
      )}
      role="status"
    >
      <div className="flex gap-3 sm:gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-sans text-base font-bold text-emerald-950 sm:text-lg">
            {PRICING_BETA_TITLE}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-emerald-900/80">
            {PRICING_BETA_DESCRIPTION}
          </p>
        </div>
      </div>
    </div>
  );
}
