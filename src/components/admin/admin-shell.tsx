"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  Heart,
  GitMerge,
  CreditCard,
  MessageCircle,
  LogOut,
  Compass,
  Menu,
  X,
  MoreHorizontal,
  ChevronDown,
  Gem,
  Headphones,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/public/logo";

const ADMIN_LOGO = "/logo-admin.png";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { PUBLIC_HOME } from "@/lib/auth/routes";

type NavLink = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const navLinks: NavLink[] = [
  { id: "dashboard", href: "/admin", label: "Tableau de bord", icon: Home, exact: true },
  { id: "users", href: "/admin/utilisateurs", label: "Utilisateurs", icon: Users },
  { id: "matches", href: "/admin/matchs", label: "Matchs", icon: GitMerge },
  { id: "payments", href: "/admin/paiements", label: "Paiements", icon: CreditCard },
  { id: "discussions", href: "/admin/conversations", label: "Discussions", icon: MessageCircle },
];

const mobilePrimary: NavLink[] = [
  { id: "home", href: "/admin", label: "Accueil", icon: Home, exact: true },
  { id: "members", href: "/admin/utilisateurs", label: "Membres", icon: Users },
  { id: "messages", href: "/admin/conversations", label: "Discussions", icon: MessageCircle },
  { id: "matches", href: "/admin/matchs", label: "Matchs", icon: GitMerge },
];

const mobileMoreLinks: NavLink[] = [
  {
    id: "proposer",
    href: "/admin/matchs?tab=proposer",
    label: "Proposer un match",
    icon: Heart,
  },
  { id: "payments", href: "/admin/paiements", label: "Paiements", icon: CreditCard },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  const baseHref = href.split("?")[0]!;
  if (exact) return pathname === baseHref;
  return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
}

function roleLabel(role?: string) {
  if (role === "superadmin") return "Super administrateur";
  if (role === "admin") return "Administrateur";
  return role ?? "";
}

function AdminHeaderLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/admin"
      className={cn(
        "inline-flex shrink-0 items-center rounded-lg bg-white px-2 py-1",
        className
      )}
      aria-label="Meet & Match — Administration"
    >
      <Image
        src={ADMIN_LOGO}
        alt="Meet & Match"
        width={240}
        height={52}
        className="h-10 w-auto max-w-[min(240px,42vw)] object-contain object-left sm:h-11"
        priority
        unoptimized
      />
    </Link>
  );
}

interface AdminShellProps {
  displayName?: string;
  role?: string;
  photoUrl?: string | null;
  notificationCount?: number;
  children: React.ReactNode;
}

export function AdminShell({
  displayName,
  role,
  photoUrl,
  notificationCount = 0,
  children,
}: AdminShellProps) {
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

  function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        {navLinks.map((link) => {
          const active = isActive(pathname, link.href, link.exact);
          const Icon = link.icon;
          return (
            <Link
              key={link.id}
              href={link.href}
              onClick={onNavigate}
              className={cn(
                "mm-admin-sidebar-link",
                active && "mm-admin-sidebar-link-active"
              )}
            >
              <Icon className="h-[22px] w-[22px] shrink-0 stroke-[1.75]" />
              <span className="flex-1 leading-none">{link.label}</span>
            </Link>
          );
        })}
      </>
    );
  }

  function ProfileBlock({ compact }: { compact?: boolean }) {
    return (
      <div className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 md:pr-3">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary/30 to-secondary/40 text-sm font-bold text-white">
          {photoUrl ? (
            <Image src={photoUrl} alt="" fill className="object-cover" sizes="40px" />
          ) : (
            (displayName?.[0] ?? "A").toUpperCase()
          )}
        </div>
        {displayName && !compact && (
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-semibold text-primary">
              {displayName}
            </p>
            {role && (
              <p className="truncate text-xs text-muted-foreground">
                {roleLabel(role)}
              </p>
            )}
          </div>
        )}
        {!compact && (
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-background">
      <header className="sticky top-0 z-40 flex h-16 w-full shrink-0 items-center justify-between border-b border-border/60 bg-card px-4 shadow-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <AdminHeaderLogo className="hidden md:inline-flex" />
          <div className="flex items-center gap-2 md:hidden">
            <AdminHeaderLogo />
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-primary hover:bg-muted"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href="/admin/notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-primary transition-colors hover:bg-muted"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="mm-badge-count absolute -right-0.5 -top-0.5">
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </Link>
          <ProfileBlock />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="mm-gradient-sidebar sticky top-16 z-30 hidden h-[calc(100dvh-4rem)] w-[252px] shrink-0 flex-col md:flex">
          <nav className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 pb-4 pt-8">
            <SidebarNav />
          </nav>

          <div className="mt-auto space-y-3 p-4">
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Gem className="h-[18px] w-[18px] stroke-[1.75] text-white" />
                </div>
                <p className="text-sm leading-relaxed text-white/85">
                  Vous avez le contrôle pour créer des rencontres sérieuses et
                  authentiques.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4 h-10 w-full rounded-full bg-white text-secondary shadow-sm hover:bg-white/95"
                asChild
              >
                <Link href="/admin/conversations">
                  <Headphones className="h-4 w-4 stroke-[1.75]" />
                  Besoin d&apos;aide ?
                </Link>
              </Button>
            </div>

            <Link
              href="/decouvrir"
              className="mm-admin-sidebar-link py-3 text-sm text-white/70"
            >
              <Compass className="h-[20px] w-[20px] shrink-0 stroke-[1.75]" />
              Voir l&apos;app utilisateur
            </Link>
            <button
              type="button"
              onClick={logout}
              className="mm-admin-sidebar-link w-full py-3 text-left text-sm text-white/70"
            >
              <LogOut className="h-[20px] w-[20px] shrink-0 stroke-[1.75]" />
              Déconnexion
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="min-h-0 flex-1 overflow-auto bg-[#f8f6fc] pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-0">
            {children}
          </main>

          <nav
            aria-label="Navigation admin"
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-card shadow-[0_-4px_20px_rgba(46,26,71,0.06)] safe-area-pb md:hidden"
          >
            <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 py-1">
              {mobilePrimary.map((link) => {
                const active = isActive(pathname, link.href, link.exact);
                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    className={cn(
                      "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors",
                      active ? "text-secondary" : "text-muted-foreground"
                    )}
                  >
                    <link.icon className={cn("h-5 w-5 stroke-[1.75]", active && "stroke-[2]")} />
                    <span className="max-w-full truncate">{link.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium",
                  isMoreActive ? "text-secondary" : "text-muted-foreground"
                )}
              >
                <MoreHorizontal className="h-5 w-5" />
                Plus
              </button>
            </div>
          </nav>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal>
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <aside className="mm-gradient-sidebar absolute inset-y-0 left-0 flex w-[min(100%,18rem)] flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <Logo size="md" variant="light" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white hover:bg-white/10"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-4 pt-6">
              <SidebarNav onNavigate={() => setDrawerOpen(false)} />
            </nav>
            <div className="space-y-2 border-t border-white/10 p-4">
              <Link
                href="/decouvrir"
                onClick={() => setDrawerOpen(false)}
                className="mm-admin-sidebar-link py-3"
              >
                <Compass className="h-[20px] w-[20px] stroke-[1.75]" />
                App utilisateur
              </Link>
              <button
                type="button"
                onClick={logout}
                className="mm-admin-sidebar-link w-full py-3 text-left"
              >
                <LogOut className="h-[20px] w-[20px] stroke-[1.75]" />
                Déconnexion
              </button>
            </div>
          </aside>
        </div>
      )}

      {moreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal>
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMoreOpen(false)}
            aria-hidden
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[70dvh] overflow-y-auto rounded-t-2xl bg-card p-5 pb-8 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-sans text-lg font-semibold text-primary">
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
            <div className="space-y-1">
              {mobileMoreLinks.map((link) => {
                const active = isActive(pathname, link.href, link.exact);
                return (
                  <Link
                    key={link.id}
                    href={link.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                      active
                        ? "bg-secondary/10 text-secondary"
                        : "hover:bg-muted"
                    )}
                  >
                    <link.icon className="h-5 w-5 stroke-[1.75]" />
                    {link.label}
                  </Link>
                );
              })}
              <Link
                href="/decouvrir"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-muted"
              >
                <Compass className="h-5 w-5" />
                App utilisateur
              </Link>
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted"
              >
                <LogOut className="h-5 w-5" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
