"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Camera,
  Compass,
  Bell,
  CreditCard,
  MessageSquare,
  LogOut,
  Heart,
  Settings,
  MoreHorizontal,
  X,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/public/logo";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { PUBLIC_HOME } from "@/lib/auth/routes";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
};

const navLinks: NavLink[] = [
  { href: "/decouvrir", label: "Découvrir", icon: Compass, exact: true },
  { href: "/rencontres", label: "Rencontres", icon: Layers, exact: true },
  { href: "/matchs", label: "Mes matchs", icon: Heart, exact: true },
  { href: "/messages", label: "Discussions", icon: MessageSquare, exact: false },
  {
    href: "/tableau-de-bord",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    exact: true,
  },
  { href: "/profil", label: "Mon profil", icon: User, exact: true },
  { href: "/profil/photos", label: "Mes photos", icon: Camera, exact: false },
  { href: "/profil/parametres", label: "Paramètres", icon: Settings, exact: true },
  { href: "/notifications", label: "Notifications", icon: Bell, exact: true },
  { href: "/paiements", label: "Paiements", icon: CreditCard, exact: true },
];

const mobilePrimary: NavLink[] = [
  { href: "/decouvrir", label: "Découvrir", icon: Compass, exact: true },
  { href: "/rencontres", label: "Rencontres", icon: Layers, exact: true },
  { href: "/decouvrir/likes", label: "Likes", icon: Heart, exact: false },
  { href: "/messages", label: "Messages", icon: MessageSquare, exact: false },
  { href: "/profil", label: "Profil", icon: User, exact: true },
];

const mobileMoreLinks: NavLink[] = navLinks.filter(
  (l) => !mobilePrimary.some((p) => p.href === l.href)
);

function isActive(pathname: string, href: string, exact: boolean) {
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

interface UserShellProps {
  unreadCount?: number;
  unreadMessageCount?: number;
  pendingMatchCount?: number;
  displayName?: string;
  children: React.ReactNode;
}

export function UserShell({
  unreadCount = 0,
  unreadMessageCount = 0,
  pendingMatchCount = 0,
  displayName,
  children,
}: UserShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [moreOpen]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push(PUBLIC_HOME);
    router.refresh();
  }

  const isMoreActive = mobileMoreLinks.some((l) =>
    isActive(pathname, l.href, l.exact)
  );

  function badgeFor(href: string) {
    if (href === "/notifications" && unreadCount > 0) {
      return unreadCount > 9 ? "9+" : unreadCount;
    }
    if (href === "/messages" && unreadMessageCount > 0) {
      return unreadMessageCount > 9 ? "9+" : unreadMessageCount;
    }
    if (href === "/matchs" && pendingMatchCount > 0) {
      return pendingMatchCount > 9 ? "9+" : pendingMatchCount;
    }
    return null;
  }

  const hideMobileNav =
    pathname.startsWith("/messages/") && pathname !== "/messages";

  return (
    <div className="flex min-h-[100dvh] w-full bg-background">
      <aside className="sticky top-0 z-30 hidden h-[100dvh] w-[4.75rem] shrink-0 flex-col border-r border-border/80 bg-card/95 backdrop-blur-md md:flex xl:w-72">
        <div className="border-b border-border/60 p-3 xl:p-5">
          <div className="flex justify-center xl:justify-start">
            <Logo size="sm" showText={false} className="xl:hidden" />
            <Logo size="sm" className="hidden xl:inline-flex" />
          </div>
          {displayName && (
            <p className="mt-3 hidden truncate text-sm text-muted-foreground xl:block">
              Bonjour,{" "}
              <span className="font-medium text-primary">{displayName}</span>
            </p>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-2 xl:p-4">
          {navLinks.map((link) => {
            const active = isActive(pathname, link.href, link.exact);
            const badge = badgeFor(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                title={link.label}
                aria-current={active ? "page" : undefined}
                className={navItemClass(active, true)}
              >
                <link.icon className="h-5 w-5 shrink-0" />
                <span className="sr-only xl:not-sr-only xl:inline">
                  {link.label}
                </span>
                {badge && (
                  <Badge
                    variant="secondary"
                    className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[9px] xl:static xl:ml-auto"
                  >
                    {badge}
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/60 p-2 xl:p-4">
          <button
            type="button"
            onClick={handleLogout}
            title="Déconnexion"
            className={cn(navItemClass(false, true), "w-full")}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span className="sr-only xl:not-sr-only xl:inline">Déconnexion</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border/80 bg-card/95 px-4 backdrop-blur-md md:hidden">
          <Logo size="sm" />
          {pathname === "/decouvrir" && (
            <span className="text-xs font-medium text-muted-foreground">
              Tous les profils
            </span>
          )}
          {pathname === "/rencontres" && (
            <span className="text-xs font-medium text-muted-foreground">
              Suggestions du jour
            </span>
          )}
        </header>

        <main
          className={cn(
            "min-h-0 flex-1 overflow-auto md:pb-0",
            hideMobileNav
              ? "pb-0"
              : "pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]"
          )}
        >
          {children}
        </main>

        <nav
          aria-label="Navigation principale"
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-card/95 backdrop-blur-md safe-area-pb md:hidden",
            hideMobileNav && "hidden"
          )}
        >
          <div className="mx-auto flex w-full max-w-lg items-stretch justify-around px-1 py-1">
            {mobilePrimary.map((tab) => {
              const active =
                isActive(pathname, tab.href, tab.exact) ||
                (tab.href === "/profil" &&
                  (pathname === "/profil" || pathname.startsWith("/profil/"))) ||
                (tab.href === "/decouvrir/likes" &&
                  pathname.startsWith("/decouvrir/likes"));
              const badge = badgeFor(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors",
                    active ? "text-secondary" : "text-muted-foreground"
                  )}
                >
                  <tab.icon
                    className={cn("h-5 w-5", active && "stroke-[2.5]")}
                  />
                  <span className="max-w-full truncate">{tab.label}</span>
                  {badge && (
                    <Badge
                      variant="secondary"
                      className="absolute right-1 top-0.5 h-4 min-w-4 px-1 text-[9px]"
                    >
                      {badge}
                    </Badge>
                  )}
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
                Menu
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
              {mobileMoreLinks.map((link) => {
                const active = isActive(pathname, link.href, link.exact);
                const badge = badgeFor(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMoreOpen(false)}
                    className={navItemClass(active)}
                  >
                    <link.icon className="h-5 w-5 shrink-0 text-secondary" />
                    {link.label}
                    {badge && (
                      <Badge variant="secondary" className="ml-auto">
                        {badge}
                      </Badge>
                    )}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={handleLogout}
                className={cn(navItemClass(false), "w-full")}
              >
                <LogOut className="h-5 w-5 shrink-0" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
