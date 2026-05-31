import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { box: "h-8 w-8 text-sm", text: "text-lg" },
  md: { box: "h-12 w-12 text-base", text: "text-2xl" },
  lg: { box: "h-16 w-16 text-lg", text: "text-3xl" },
};

export function Logo({ className, showText = true, size = "md" }: LogoProps) {
  const s = sizes[size];

  return (
    <Link href="/" className={cn("inline-flex items-center gap-3", className)}>
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-secondary/80 font-serif font-bold text-white shadow-sm",
          s.box
        )}
        aria-hidden
      >
        M
      </span>
      {showText && (
        <span className={cn("font-serif font-semibold leading-tight", s.text)}>
          <span className="text-secondary">Meet</span>
          <span className="text-primary"> & Match</span>
        </span>
      )}
    </Link>
  );
}
