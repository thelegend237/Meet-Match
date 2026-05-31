"use client";

import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminSearchInput({
  value,
  onChange,
  placeholder = "Rechercher…",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative max-w-md", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border/60 bg-card pl-10 pr-4 text-sm shadow-sm outline-none ring-secondary/30 focus:ring-2"
      />
    </div>
  );
}
