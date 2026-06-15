"use client";

import { useEffect } from "react";
import { touchLastSeen } from "@/lib/actions/discover";

const HEARTBEAT_MS = 2 * 60 * 1000;

export function LastSeenHeartbeat() {
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        void touchLastSeen();
      }
    };

    tick();
    const id = window.setInterval(tick, HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
