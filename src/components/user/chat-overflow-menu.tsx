"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MoreVertical, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type ChatMenuItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

interface ChatOverflowMenuProps {
  items: ChatMenuItem[];
  pending?: boolean;
  className?: string;
}

export function ChatOverflowMenu({
  items,
  pending = false,
  className,
}: ChatOverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className={cn("relative", className)} ref={rootRef}>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-[#5b3d8f] transition-colors hover:bg-[#f3eef8] disabled:opacity-60"
        aria-label="Options de la conversation"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <MoreVertical className="h-5 w-5" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 min-w-[13.5rem] overflow-hidden rounded-xl border border-[#e8e0f0] bg-white py-1 shadow-[0_8px_24px_rgba(46,26,71,0.12)]"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled || pending}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left text-[14px] transition-colors hover:bg-[#faf8fc] disabled:opacity-50",
                  item.destructive
                    ? "text-[#be185d]"
                    : "text-[#2e1a47]"
                )}
              >
                {Icon && <Icon className="h-4 w-4 shrink-0 opacity-80" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
