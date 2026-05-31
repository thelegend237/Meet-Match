"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Heart,
  GitMerge,
  CreditCard,
  MessageSquare,
  LogOut,
  Compass,
  Menu,
  X,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/public/logo";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { PUBLIC_HOME } from "@/lib/auth/routes";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const navLinks: NavLink[] = [
  { href: "/admin", label: "Vue générale", icon: LayoutDashboard, exact: true },
  { href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/matching", label: "Matching", icon: Heart },
  { href: "/admin/matchs", label: "Matchs", icon: GitMerge },
  { href: "/admin/paiements", label: "Paiements", icon: CreditCard },
  { href: "/admin/conversations", label: "Conversations", icon: MessageSquare },
  {
    href: "/admin/conversations/matchs",
    label: "Discussions matchs",
    icon: Heart,
  },
];

const mobilePrimary: NavLink[] = [
  { href: "/admin", label: "Accueil", icon: LayoutDashboard, exact: true },
  { href: "/admin/utilisateurs", label: "Membres", icon: Users },
  { href: "/admin/conversations", label: "Messages", icon: MessageSquare },
  { href: "/admin/matching", label: "Matching", icon: Heart },
];

const mobileMoreLinks: NavLink[] = navLinks.filter(
  (l) => !mobilePrimary.some((p) => p.href === l.href)
);

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navItemClass(active: boolean, compact?: boolean) {
  return cn(
    "group relative flex items-center rounded-xl font-medium transition-all",
    compact
      ? "justify-center p-2.5 xl:justify-start xl:gap-3 xl:px-3 xl:py-2.5"
      : "gap-3 px-3 py-2.5 text-sm",
    active
      ? "bg-secondary text-secondary-foreground shadow-sm shadow-secondary/20"
      : "text-muted-foreground hover:bg-muted/80 hover:text-primary"
  );
}

function NavItem({
  link,
  pathname,
  compact,
  onNavigate,
}: {
  link: NavLink;
  pathname: string;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const active = isActive(pathname, link.href, link.exact);

  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      title={compact ? link.label : undefined}
      aria-current={active ? "page" : undefined}
      className={navItemClass(active, compact)}
    >
      <link.icon
        className={cn(
          "shrink-0",
          compact ? "h-5 w-5" : "h-4 w-4",
          active ? "text-secondary-foreground" : "text-current"
        )}
      />
      <span
        className={cn(
          "truncate",
          compact && "sr-only xl:not-sr-only xl:inline"
        )}
      >
        {link.label}
      </span>
      {active && compact && (
        <span className="absolute -left-1 top-1/2 hidden h-6 w-1 -translate-y-1/2 rounded-full bg-secondary xl:block" />
      )}
    </Link>
  );
}

interface AdminShellProps {
  displayName?: string;
  role?: string;
  children: React.ReactNode;
}

export function AdminShell({ displayName, role, children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen && !moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen, moreOpen]);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(PUBLIC_HOME);
    router.refresh();
  }

  const isMoreActive = mobileMoreLinks.some((l) =>
    isActive(pathname, l.href, l.exact)
  );

  return (
    <div className="flex min-h-[100dvh] w-full bg-background">
      {/* Sidebar tablette / desktop */}
      <aside className="sticky top-0 z-30 hidden h-[100dvh] w-[4.75rem] shrink-0 flex-col border-r border-border/80 bg-card/95 backdrop-blur-md md:flex xl:w-72">
        <div className="border-b border-border/60 p-3 xl:p-5">
          <div className="flex justify-center xl:justify-start">
            <Logo size="sm" showText={false} className="xl:hidden" />
            <Logo size="sm" className="hidden xl:inline-flex" />
          </div>
          <div className="mt-3 hidden xl:block">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Administration
            </p>
            {displayName && (
              <p className="mt-2 truncate text-sm text-muted-foreground">
                {displayName}
                {role && <span className="ml-1 text-xs">({role})</span>}
              </p>
            )}
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2 xl:p-4">
          {navLinks.map((link) => (
            <NavItem
              key={link.href}
              link={link}
              pathname={pathname}
              compact
            />
          ))}
        </nav>

        <div className="space-y-1 border-t border-border/60 p-2 xl:p-4">
          <Link
            href="/decouvrir"
            title="Voir l'app utilisateur"
            className={navItemClass(false, true)}
          >
            <Compass className="h-5 w-5 shrink-0" />
            <span className="sr-only xl:not-sr-only xl:inline">
              Voir l&apos;app utilisateur
            </span>
          </Link>
          <button
            type="button"
            onClick={logout}
            title="Déconnexion"
            className={cn(navItemClass(false, true), "w-full")}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="sr-only xl:not-sr-only xl:inline">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Colonne principale */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-card/95 px-4 backdrop-blur-md md:hidden">
          <Logo size="sm" />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-primary transition-colors hover:bg-muted"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-auto bg-muted/20 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          {children}
        </main>

        {/* Navigation basse mobile */}
        <nav
          aria-label="Navigation principale"
          className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-card/95 backdrop-blur-md safe-area-pb md:hidden"
        >
          <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1">
            {mobilePrimary.map((link) => {
              const active = isActive(pathname, link.href, link.exact);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors",
                    active ? "text-secondary" : "text-muted-foreground"
                  )}
                >
                  <link.icon
                    className={cn("h-5 w-5", active && "stroke-[2.5]")}
                  />
                  <span className="max-w-full truncate">{link.label}</span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors",
                isMoreActive ? "text-secondary" : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              Plus
            </button>
          </div>
        </nav>
      </div>

      {/* Tiroir menu complet (mobile) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal>
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/60 p-4">
              <Logo size="sm" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"
                aria-label="Fermer le menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {displayName && (
              <p className="border-b border-border/40 px-4 py-3 text-sm text-muted-foreground">
                {displayName}
                {role && <span className="ml-1 text-xs">({role})</span>}
              </p>
            )}
            <nav className="flex-1 space-y-1 overflow-y-auto p-3">
              {navLinks.map((link) => (
                <NavItem
                  key={link.href}
                  link={link}
                  pathname={pathname}
                  onNavigate={() => setDrawerOpen(false)}
                />
              ))}
              <Link
                href="/decouvrir"
                onClick={() => setDrawerOpen(false)}
                className={navItemClass(false)}
              >
                <Compass className="h-4 w-4 shrink-0" />
                Voir l&apos;app utilisateur
              </Link>
            </nav>
            <div className="border-t border-border/60 p-3">
              <button
                type="button"
                onClick={logout}
                className={cn(navItemClass(false), "w-full")}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feuille « Plus » (mobile) */}
      {moreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal>
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMoreOpen(false)}
            aria-hidden
          />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-card p-5 pb-8 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold text-primary">
                Administration
              </h3>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[50dvh] space-y-1 overflow-y-auto">
              {mobileMoreLinks.map((link) => (
                <NavItem
                  key={link.href}
                  link={link}
                  pathname={pathname}
                  onNavigate={() => setMoreOpen(false)}
                />
              ))}
              <Link
                href="/decouvrir"
                onClick={() => setMoreOpen(false)}
                className={navItemClass(false)}
              >
                <Compass className="h-4 w-4 shrink-0" />
                Voir l&apos;app utilisateur
              </Link>
              <button
                type="button"
                onClick={logout}
                className={cn(navItemClass(false), "w-full")}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
