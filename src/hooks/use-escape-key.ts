"use client";

import { useEffect } from "react";

export function useEscapeKey(
  enabled: boolean,
  onEscape: () => void,
  options?: { disabled?: boolean }
) {
  const blocked = options?.disabled ?? false;

  useEffect(() => {
    if (!enabled || blocked) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onEscape();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, blocked, onEscape]);
}
