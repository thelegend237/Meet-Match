import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { ChangePasswordForm } from "@/components/user/change-password-form";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Paramètres",
};

interface PageProps {
  searchParams: Promise<{ reset?: string }>;
}

export default async function ParametresPage({ searchParams }: PageProps) {
  await requireUser();
  const { reset } = await searchParams;
  const fromReset = reset === "1";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/profil">← Profil</Link>
        </Button>
        <h1 className="font-serif text-3xl font-bold text-primary">Paramètres</h1>
        <p className="mt-2 text-muted-foreground">
          Sécurité et accès à votre compte.
        </p>
      </div>

      <ChangePasswordForm fromReset={fromReset} />
    </div>
  );
}
