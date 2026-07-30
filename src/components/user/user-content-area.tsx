"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  isUserMessageThread,
  isUserMessagesSection,
} from "@/lib/navigation/mobile-shell";

export function UserContentArea({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMessages = isUserMessagesSection(pathname);
  const isMessageThread = isUserMessageThread(pathname);
  const isEdgeToEdge =
    pathname === "/profil" ||
    pathname.startsWith("/decouvrir") ||
    pathname.startsWith("/rencontres");

  if (isMessages) {
    return (
      <div
        className={cn(
          "mm-page-enter flex min-h-0 flex-col overflow-hidden",
          isMessageThread
            ? "h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)]"
            : "h-[calc(100dvh-3.5rem-var(--mm-bottom-nav-h)-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-4rem)]"
        )}
      >
        {children}
      </div>
    );
  }

  if (isEdgeToEdge) {
    return (
      <div
        key={pathname}
        className="mm-page-enter w-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7"
      >
        {children}
      </div>
    );
  }

  return (
    <div key={pathname} className={cn("mm-page-enter mm-page-container")}>
      {children}
    </div>
  );
}
