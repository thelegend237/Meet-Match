"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Shield } from "lucide-react";
import { getInitials } from "@/lib/chat/format";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  title: string;
  subtitle?: string;
  avatarUrl?: string | null;
  backHref?: string;
  isOpen?: boolean;
  isAdmin?: boolean;
  className?: string;
}

export function ChatHeader({
  title,
  subtitle,
  avatarUrl,
  backHref,
  isOpen = true,
  isAdmin = false,
  className,
}: ChatHeaderProps) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-center gap-3 border-b border-border/60 bg-card/95 px-3 py-3 backdrop-blur-md sm:px-4",
        className
      )}
    >
      {backHref && (
        <Link
          href={backHref}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-primary transition-colors hover:bg-muted"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      )}

      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 ring-2 ring-background">
        {avatarUrl ? (
          <Image src={avatarUrl} alt="" fill className="object-cover" sizes="44px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary">
            {getInitials(title)}
          </div>
        )}
        {isOpen && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h1 className="truncate text-base font-semibold text-primary">{title}</h1>
          {isAdmin && (
            <Shield className="h-3.5 w-3.5 shrink-0 text-secondary" aria-label="Admin" />
          )}
        </div>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {!isOpen && (
        <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Fermé
        </span>
      )}
    </header>
  );
}
