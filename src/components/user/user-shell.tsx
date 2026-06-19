"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Compass,
  CreditCard,
  MessageSquare,
  LogOut,
  Heart,
  Sparkles,
  MoreHorizontal,
  X,
  Layers,
  Headphones,
  ChevronDown,
  Gem,
  Bell,
  User,
  LayoutDashboard,
  Camera,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/public/logo";
import { MemberWelcomeTourGate } from "@/components/user/member-welcome-tour-gate";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { PUBLIC_HOME } from "@/lib/auth/routes";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
};

const sidebarLinks: NavLink[] = [
  { href: "/decouvrir", label: "Profils", icon: Compass, exact: true },
  { href: "/rencontres", label: "Rencontres", icon: Layers, exact: true },
  { href: "/decouvrir/likes", label: "Mes likes", icon: Heart, exact: false },
  { href: "/matchs", label: "Mon match", icon: Sparkles, exact: true },
  { href: "/messages", label: "Messages", icon: MessageSquare, exact: false },
  { href: "/paiements", label: "Paiements", icon: CreditCard, exact: true },
  { href: "/contact", label: "Contact admin", icon: Headphones, exact: true },
];

const mobilePrimary: NavLink[] = [
  { href: "/decouvrir", label: "Découvrir", icon: Compass, exact: true },
  { href: "/rencontres", label: "Rencontres", icon: Layers, exact: true },
  { href: "/decouvrir/likes", label: "Likes", icon: Heart, exact: false },
  { href: "/messages", label: "Messages", icon: MessageSquare, exact: false },
  { href: "/matchs", label: "Match", icon: Sparkles, exact: true },
];

const accountMenuLinks: NavLink[] = [
  { href: "/profil", label: "Mon profil", icon: User, exact: true },
  {
    href: "/tableau-de-bord",
    label: "Tableau de bord",
    icon: LayoutDashboard,
    exact: true,
  },
  { href: "/profil/photos", label: "Mes photos", icon: Camera, exact: false },
  {
    href: "/profil/parametres",
    label: "Paramètres",
    icon: Settings,
    exact: true,
  },
];

function isActive(pathname: string, href: string, exact: boolean) {
  if (href === "/decouvrir/likes") {
    return pathname.startsWith("/decouvrir/likes");
  }
  if (href === "/profil/photos") {
    return pathname.startsWith("/profil/photos");
  }
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface UserShellProps {
  unreadCount?: number;
  unreadMessageCount?: number;
  pendingMatchCount?: number;
  likedCount?: number;
  displayName?: string;
  avatarUrl?: string | null;
  welcomeTourEligible?: boolean;
  children: React.ReactNode;
}

export function UserShell({
  unreadCount = 0,
  unreadMessageCount = 0,
  pendingMatchCount = 0,
  likedCount = 0,
  displayName,
  avatarUrl,
  welcomeTourEligible = false,
  children,
}: UserShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMoreOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (!accountRef.current?.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [accountOpen]);

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

  function badgeFor(href: string) {
    if (href === "/messages" && unreadMessageCount > 0) {
      return unreadMessageCount > 9 ? "9+" : String(unreadMessageCount);
    }
    if (href === "/matchs" && pendingMatchCount > 0) {
      return pendingMatchCount > 9 ? "9+" : String(pendingMatchCount);
    }
    if (href === "/decouvrir/likes" && likedCount > 0) {
      return likedCount > 9 ? "9+" : String(likedCount);
    }
    return null;
  }

  const isMessagesRoute = pathname.startsWith("/messages");
  const hideMobileNav = isMessagesRoute;

  function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        {sidebarLinks.map((link) => {
          const active = isActive(pathname, link.href, link.exact);
          const badge = badgeFor(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "mm-admin-sidebar-link mm-nav-link-motion",
                active && "mm-admin-sidebar-link-active"
              )}
            >
              <Icon className="h-[22px] w-[22px] shrink-0 stroke-[1.75]" />
              <span className="flex-1 leading-none">{link.label}</span>
              {badge && (
                <span className="mm-badge-count ml-auto shrink-0">{badge}</span>
              )}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background">
      <header className="sticky top-0 z-40 flex h-14 w-full shrink-0 border-b border-border/60 bg-white shadow-sm md:h-16">
        <div
          className={cn(
            "hidden shrink-0 items-center border-r border-border/40 px-4 md:flex md:w-[252px] md:px-5",
            isMessagesRoute && "md:flex"
          )}
        >
          <Logo size="sm" />
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 sm:px-6">
          <div className={cn("flex items-center md:hidden", isMessagesRoute && "hidden")}>
            <Logo size="sm" />
          </div>
          <div className="flex-1" />

          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff3d6e] px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>

            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((o) => !o)}
                className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-muted md:pr-3"
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                aria-label="Menu compte"
              >
                <div className="relative h-9 w-9 overflow-hidden rounded-full bg-gradient-to-br from-primary/20 to-secondary/30 ring-2 ring-border/50">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="36px"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs font-bold text-primary">
                      {(displayName?.[0] ?? "M").toUpperCase()}
                    </div>
                  )}
                </div>
                {displayName && (
                  <span className="hidden max-w-[120px] truncate text-sm font-medium text-primary sm:inline">
                    {displayName}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "hidden h-4 w-4 text-muted-foreground transition-transform sm:block",
                    accountOpen && "rotate-180"
                  )}
                />
              </button>

              {accountOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-border/80 bg-card py-1 shadow-lg"
                >
                  {accountMenuLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      role="menuitem"
                      onClick={() => setAccountOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted",
                        isActive(pathname, link.href, link.exact)
                          ? "text-secondary"
                          : "text-foreground"
                      )}
                    >
                      <link.icon className="h-4 w-4 shrink-0 opacity-80" />
                      {link.label}
                    </Link>
                  ))}
                  <div className="my-1 border-t border-border/60" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccountOpen(false);
                      void handleLogout();
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <LogOut className="h-4 w-4 shrink-0" />
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="mm-gradient-sidebar sticky top-14 z-30 hidden h-[calc(100dvh-3.5rem)] w-[252px] shrink-0 flex-col md:top-16 md:flex md:h-[calc(100dvh-4rem)]">
          <nav className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-4 pt-6">
            <SidebarNav />
          </nav>

          <div className="mt-auto p-4">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Gem className="h-[18px] w-[18px] stroke-[1.75] text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-white">
                    Accès prioritaire aux meilleurs profils
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/75">
                    Laissez notre équipe vous trouver la bonne personne.
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 h-10 w-full rounded-full bg-white text-secondary shadow-sm hover:bg-white/95"
                asChild
              >
                <Link href="/paiements">Découvrir nos formules</Link>
              </Button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main
            className={cn(
              "min-h-0 flex-1 md:pb-0",
              isMessagesRoute
                ? "overflow-hidden bg-[#f8f6fc]"
                : "overflow-auto bg-[#f8f6fc]",
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
              "fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-card shadow-[0_-4px_20px_rgba(46,26,71,0.06)] safe-area-pb md:hidden",
              hideMobileNav && "hidden"
            )}
          >
            <div className="mx-auto flex w-full max-w-lg items-stretch justify-around px-1 py-1">
              {mobilePrimary.map((tab) => {
                const active = isActive(pathname, tab.href, tab.exact);
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
                    <tab.icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                    <span className="max-w-full truncate">{tab.label}</span>
                    {badge && (
                      <span className="absolute right-2 top-0.5 mm-badge-count">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium text-muted-foreground"
              >
                <MoreHorizontal className="h-5 w-5" />
                Plus
              </button>
            </div>
          </nav>
        </div>
      </div>

      {moreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal>
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMoreOpen(false)}
            aria-hidden
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-card p-5 pb-8 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-sans text-lg font-semibold text-primary">Menu</h3>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-1">
              {sidebarLinks
                .filter((l) => !mobilePrimary.some((p) => p.href === l.href))
                .map((link) => {
                const active = isActive(pathname, link.href, link.exact);
                const badge = badgeFor(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                      active
                        ? "bg-secondary/10 text-secondary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <link.icon className="h-5 w-5 shrink-0" />
                    {link.label}
                    {badge && (
                      <span className="ml-auto mm-badge-count">{badge}</span>
                    )}
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                <LogOut className="h-5 w-5" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      <MemberWelcomeTourGate eligible={welcomeTourEligible} />
    </div>
  );
}
