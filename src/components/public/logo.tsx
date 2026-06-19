import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Logo complet (icône + texte) ou icône seule */
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  /** default = pages claires ; light = sidebar / footer sombre */
  variant?: "default" | "light";
}

const fullLogoSizes = {
  sm: { width: 160, height: 40, className: "h-9 w-auto sm:h-10" },
  md: { width: 200, height: 48, className: "h-11 w-auto sm:h-12" },
  lg: { width: 260, height: 60, className: "h-14 w-auto sm:h-16" },
} as const;

const iconSizes = {
  sm: { size: 32, className: "h-8 w-8" },
  md: { size: 44, className: "h-11 w-11" },
  lg: { size: 56, className: "h-14 w-14" },
} as const;

const assets = {
  full: "/logo-admin.png",
  icon: "/logo-icon.png",
  alt: "Meet & Match",
} as const;

export function Logo({
  className,
  showText = true,
  size = "md",
  variant = "default",
}: LogoProps) {
  const onDark = variant === "light";
  const full = fullLogoSizes[size];
  const icon = iconSizes[size];

  if (onDark && showText) {
    return (
      <Link
        href="/"
        className={cn("inline-flex shrink-0 items-center gap-2.5", className)}
        aria-label="Meet & Match — Accueil"
      >
        <span className="flex shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-md">
          <Image
            src={assets.icon}
            alt=""
            width={icon.size}
            height={icon.size}
            className={cn("object-contain", icon.className)}
            priority
            aria-hidden
          />
        </span>
        <span
          className={cn(
            "font-brand font-semibold leading-tight tracking-tight text-white",
            size === "sm" && "text-lg",
            size === "md" && "text-xl",
            size === "lg" && "text-2xl"
          )}
        >
          Meet <span className="text-pink-200">&</span> Match
        </span>
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className={cn("inline-flex shrink-0 items-center", className)}
      aria-label="Meet & Match — Accueil"
    >
      {showText ? (
        <Image
          src={assets.full}
          alt={assets.alt}
          width={full.width}
          height={full.height}
          className={cn("object-contain object-left", full.className)}
          priority
        />
      ) : onDark ? (
        <span className="flex shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-md">
          <Image
            src={assets.icon}
            alt=""
            width={icon.size}
            height={icon.size}
            className={cn("object-contain", icon.className)}
            priority
            aria-hidden
          />
        </span>
      ) : (
        <Image
          src={assets.icon}
          alt=""
          width={icon.size}
          height={icon.size}
          className={cn("object-contain", icon.className)}
          priority
          aria-hidden
        />
      )}
    </Link>
  );
}
