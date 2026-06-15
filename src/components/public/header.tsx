"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Logo } from "@/components/public/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Collapse } from "@/components/motion/motion";

const navLinks = [
  { href: "/", label: "Accueil" },
  { href: "/fonctionnement", label: "Comment ça marche" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/contact", label: "Contact" },
];

export interface HeaderProps {
  isAuthenticated?: boolean;
  homeHref?: string;
  displayName?: string | null;
  /** Page d'accueil : un seul bouton « Se connecter » (formulaire visible) */
  landing?: boolean;
}

export function Header({
  isAuthenticated = false,
  homeHref = "/decouvrir",
  displayName,
  landing = false,
}: HeaderProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const accountLabel = displayName?.trim() || "Mon espace";

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-md",
        landing
          ? "border-[#ebe6f0]/70 bg-white/92 shadow-[0_1px_0_rgba(46,26,71,0.04)]"
          : "border-border/50 bg-card/95 shadow-sm supports-[backdrop-filter]:bg-card/90"
      )}
    >
      <div className="mx-auto flex h-16 items-center justify-between px-4 sm:max-w-7xl sm:px-6 lg:px-8">
        <Logo size="sm" />

        <nav className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  active
                    ? landing ? "text-[#e91e8c]" : "text-secondary"
                    : landing ? "text-[#6b5f7a] hover:text-[#2e1a47]" : "text-muted-foreground hover:text-primary"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <Button variant="secondary" className="rounded-full shadow-md shadow-secondary/20" asChild>
              <Link href={homeHref}>{accountLabel}</Link>
            </Button>
          ) : landing ? (
            <Button variant="outline" className="mm-landing-btn-outline rounded-full px-6" asChild>
              <Link href="/connexion">Se connecter</Link>
            </Button>
          ) : (
            <>
              <Button variant="outline" className="rounded-full border-primary/30" asChild>
                <Link href="/connexion">Se connecter</Link>
              </Button>
              <Button variant="secondary" className="rounded-full shadow-md shadow-secondary/20" asChild>
                <Link href="/inscription">Créer mon compte</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-xl p-2 text-primary lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <Collapse open={mobileOpen}>
        <div className="border-t border-border bg-card px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1 mm-motion-step">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <hr className="my-3 border-border" />
            {isAuthenticated ? (
              <Button variant="secondary" asChild className="mt-2 h-12 w-full rounded-full">
                <Link href={homeHref} onClick={() => setMobileOpen(false)}>
                  {accountLabel}
                </Link>
              </Button>
            ) : landing ? (
              <Button variant="outline" asChild className="mt-2 h-12 w-full rounded-full">
                <Link href="/connexion" onClick={() => setMobileOpen(false)}>
                  Se connecter
                </Link>
              </Button>
            ) : (
              <>
                <Link
                  href="/connexion"
                  className="rounded-xl px-3 py-2.5 text-sm font-medium"
                  onClick={() => setMobileOpen(false)}
                >
                  Se connecter
                </Link>
                <Button variant="secondary" asChild className="mt-2 h-12 w-full rounded-full">
                  <Link href="/inscription" onClick={() => setMobileOpen(false)}>
                    Créer mon compte
                  </Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </Collapse>
    </header>
  );
}
