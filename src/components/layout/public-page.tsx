import { cn } from "@/lib/utils";

export function PublicPage({
  title,
  description,
  eyebrow,
  children,
  centered = true,
  narrow = false,
  wide = false,
  variant = "default",
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  children: React.ReactNode;
  centered?: boolean;
  narrow?: boolean;
  wide?: boolean;
  variant?: "default" | "landing";
  className?: string;
}) {
  const isLanding = variant === "landing";

  return (
    <div
      className={cn(
        isLanding && "mm-landing-page relative min-h-full overflow-hidden",
        className
      )}
    >
      {isLanding && (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_15%_0%,rgba(252,231,243,0.55),transparent_55%),radial-gradient(ellipse_70%_50%_at_90%_10%,rgba(237,233,254,0.45),transparent_50%)]"
          aria-hidden
        />
      )}

      <div
        className={cn(
          "relative",
          isLanding ? "mm-landing-section-inner py-14 sm:py-16 lg:py-20" : "mm-public-page",
          !isLanding && narrow && "max-w-3xl",
          !isLanding && !narrow && !wide && "max-w-4xl",
          !isLanding && wide && "max-w-6xl"
        )}
      >
        <header className={cn("mb-10 sm:mb-12", centered && "text-center")}>
          {eyebrow && (
            <p
              className={cn(
                isLanding ? "mm-landing-eyebrow" : "text-xs font-semibold uppercase tracking-wider text-secondary",
                centered && "mx-auto"
              )}
            >
              {eyebrow}
            </p>
          )}
          <h1
            className={cn(
              isLanding
                ? cn("mm-landing-title", eyebrow && "mt-2")
                : "font-serif text-3xl font-bold tracking-tight text-primary sm:text-4xl"
            )}
          >
            {title}
          </h1>
          {description && (
            <p
              className={cn(
                "mt-4 leading-relaxed",
                isLanding
                  ? cn("mm-landing-subtitle sm:text-lg", centered && "mx-auto max-w-2xl")
                  : cn("text-base text-muted-foreground sm:text-lg", centered && "mx-auto max-w-2xl")
              )}
            >
              {description}
            </p>
          )}
        </header>
        {children}
      </div>
    </div>
  );
}
