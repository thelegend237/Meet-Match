"use client";

import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SPOKEN_LANGUAGES,
  toggleSpokenLanguage,
  type SpokenLanguageCode,
} from "@/lib/languages";

type LanguageOption = {
  value: SpokenLanguageCode;
  label: string;
  icon?: LucideIcon;
};

const DEFAULT_OPTIONS: LanguageOption[] = SPOKEN_LANGUAGES.map((l) => ({
  value: l.code,
  label: l.label,
}));

interface LanguageMultiSelectProps {
  value: SpokenLanguageCode[];
  onChange: (value: SpokenLanguageCode[]) => void;
  options?: LanguageOption[];
  columns?: 2 | 3;
  variant?: "onboarding" | "register";
  hint?: string;
}

export function LanguageMultiSelect({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  columns = 2,
  variant = "onboarding",
  hint = "Vous pouvez en sélectionner plusieurs.",
}: LanguageMultiSelectProps) {
  function toggle(code: SpokenLanguageCode) {
    onChange(toggleSpokenLanguage(value, code) as SpokenLanguageCode[]);
  }

  const isRegister = variant === "register";

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "grid gap-2",
          columns === 3 ? "grid-cols-3" : "grid-cols-2",
          isRegister && "gap-3"
        )}
      >
        {options.map((opt) => {
          const selected = value.includes(opt.value);
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              aria-pressed={selected}
              className={cn(
                "relative flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98]",
                isRegister
                  ? cn(
                      "rounded-xl border px-3 py-5",
                      selected
                        ? "border-secondary/50 bg-gradient-to-b from-secondary/10 to-[#fce7f3]/20 shadow-sm ring-1 ring-secondary/20"
                        : "border-border/60 bg-[#faf8fc] hover:border-secondary/25 hover:bg-white"
                    )
                  : cn(
                      "rounded-2xl border px-3 py-4",
                      selected
                        ? "border-secondary bg-secondary/10 shadow-sm"
                        : "border-border/60 bg-muted/20 hover:bg-muted/40"
                    )
              )}
            >
              {selected && (
                <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-white">
                  <Check className="h-3 w-3 stroke-[3]" />
                </span>
              )}
              {Icon && (
                <Icon
                  className={cn(
                    "h-6 w-6",
                    selected ? "text-secondary" : "text-muted-foreground"
                  )}
                />
              )}
              <span
                className={cn(
                  "text-center text-sm font-medium",
                  selected ? "text-primary" : "text-muted-foreground",
                  isRegister && "font-semibold"
                )}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
      {hint && (
        <p className="text-center text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
