import Link from "next/link";
import { Logo } from "@/components/public/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-accent/80 via-background to-secondary/5">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-6 sm:py-10">
        <div className="mb-6 flex justify-center">
          <Logo size="sm" />
        </div>
        <div className="flex flex-1 flex-col justify-center">{children}</div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-secondary transition-colors">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
