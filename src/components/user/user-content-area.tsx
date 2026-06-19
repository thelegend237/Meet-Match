"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function UserContentArea({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMessages = pathname.startsWith("/messages");
  const isEdgeToEdge =
    pathname === "/profil" ||
    pathname.startsWith("/decouvrir") ||
    pathname.startsWith("/rencontres");

  if (isMessages) {
    return (
      <div className="mm-page-enter flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col overflow-hidden md:h-[calc(100dvh-4rem)]">
        {children}
      </div>
    );
  }

  if (isEdgeToEdge) {
    return (
      <div
        key={pathname}
        className="mm-page-enter w-full px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-7"
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
