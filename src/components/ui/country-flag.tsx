"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

function normalizeCountryCode(code: string | null | undefined) {
  const normalized = code?.trim().toUpperCase();
  if (!normalized || !/^[A-Z]{2}$/.test(normalized)) return null;
  return normalized;
}

function flagSources(code: string, size: number) {
  const lower = code.toLowerCase();
  return [
    `/flags/${lower}.svg`,
    `https://cdn.jsdelivr.net/npm/circle-flags@1.0.0/flags/${lower}.svg`,
    `https://flagcdn.com/w${Math.max(size * 2, 40)}/${lower}.png`,
  ];
}

interface CountryFlagProps {
  code: string | null | undefined;
  className?: string;
  size?: number;
}

export function CountryFlag({ code, className, size = 20 }: CountryFlagProps) {
  const normalized = normalizeCountryCode(code);
  const [sourceIndex, setSourceIndex] = useState(0);

  if (!normalized) {
    return (
      <span
        className={cn(
          "inline-flex h-4 w-5 shrink-0 items-center justify-center rounded-sm bg-muted text-[10px] text-muted-foreground",
          size === 22 && "h-[17px] w-[22px]",
          className
        )}
        aria-hidden
      >
        —
      </span>
    );
  }

  const sources = flagSources(normalized, size);
  const src = sources[sourceIndex];
  const height = Math.round(size * 0.75);

  if (!src || sourceIndex >= sources.length) {
    return (
      <span
        className={cn(
          "inline-flex h-4 w-5 shrink-0 items-center justify-center rounded-sm bg-muted text-[9px] font-bold uppercase text-muted-foreground",
          size === 22 && "h-[17px] w-[22px]",
          className
        )}
        title={normalized}
      >
        {normalized}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- drapeaux multi-sources + fallback
    <img
      src={src}
      alt=""
      width={size}
      height={height}
      className={cn(
        "inline-block shrink-0 rounded-sm object-cover ring-1 ring-border/30",
        className
      )}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setSourceIndex((index) => index + 1)}
    />
  );
}
