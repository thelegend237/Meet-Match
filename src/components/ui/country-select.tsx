"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { CountryFlag } from "@/components/ui/country-flag";
import { cn } from "@/lib/utils";

export interface CountryOption {
  code: string;
  name: string;
}

interface CountrySelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CountryOption[];
  id?: string;
  className?: string;
  triggerClassName?: string;
  allValue?: string;
  allLabel?: string;
  placeholder?: string;
  showAllOption?: boolean;
}

export function CountrySelect({
  value,
  onChange,
  options,
  id,
  className,
  triggerClassName,
  allValue = "all",
  allLabel = "Tous les pays",
  placeholder = "Sélectionnez un pays",
  showAllOption = true,
}: CountrySelectProps) {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selected =
    value === allValue || !value
      ? null
      : options.find((option) => option.code === value) ?? null;

  const label =
    value === allValue
      ? allLabel
      : selected?.name ?? placeholder;

  useEffect(() => {
    function handlePointerDown(event: MouseEvent | TouchEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, []);

  function selectOption(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center gap-2.5 text-left",
          triggerClassName
        )}
      >
        {selected ? (
          <CountryFlag code={selected.code} size={20} className="shrink-0" />
        ) : (
          <span className="inline-flex h-4 w-5 shrink-0 items-center justify-center rounded-sm bg-muted text-[10px] text-muted-foreground">
            —
          </span>
        )}
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-[#e8e0f0] bg-white py-1 shadow-[0_12px_32px_rgba(46,26,71,0.12)]"
        >
          {showAllOption && (
            <li role="option" aria-selected={value === allValue}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#faf8fc]",
                  value === allValue && "bg-[#fce8f3]/60 font-semibold text-[#2e1a47]"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(allValue)}
              >
                <span className="inline-flex h-4 w-5 shrink-0 items-center justify-center rounded-sm bg-muted text-[10px] text-muted-foreground">
                  —
                </span>
                <span>{allLabel}</span>
              </button>
            </li>
          )}
          {options.map((option) => (
            <li
              key={option.code}
              role="option"
              aria-selected={value === option.code}
            >
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#faf8fc]",
                  value === option.code &&
                    "bg-[#fce8f3]/60 font-semibold text-[#2e1a47]"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectOption(option.code)}
              >
                <CountryFlag code={option.code} size={20} className="shrink-0" />
                <span className="truncate">{option.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
