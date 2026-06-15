"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/public/header";
import { Footer } from "@/components/public/footer";
import { cn } from "@/lib/utils";

interface PublicShellProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  homeHref?: string;
  displayName?: string | null;
}

export function PublicShell({
  children,
  isAuthenticated,
  homeHref,
  displayName,
}: PublicShellProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col",
        isHome ? "bg-[#f8f6fc]" : "bg-background"
      )}
    >
      <Header
        isAuthenticated={isAuthenticated}
        homeHref={homeHref}
        displayName={displayName}
        landing={isHome}
      />
      <main className="flex-1">{children}</main>
      <Footer landing={isHome} />
    </div>
  );
}
