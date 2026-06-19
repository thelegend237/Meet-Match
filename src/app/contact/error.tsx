"use client";

import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContactError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mm-page-container flex min-h-[50vh] flex-col items-center justify-center py-16 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h1 className="font-sans text-2xl font-bold text-primary">
        Impossible d&apos;afficher la page contact
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        Votre session a peut-être expiré. Rechargez la page ou reconnectez-vous,
        puis réessayez.
      </p>
      {process.env.NODE_ENV === "development" && error.message && (
        <p className="mt-4 max-w-lg break-all text-xs text-muted-foreground">
          {error.message}
        </p>
      )}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button type="button" onClick={() => reset()}>
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
        <Button variant="outline" asChild>
          <Link href="/connexion">Se reconnecter</Link>
        </Button>
        <Button variant="ghost" asChild>
          <Link href="/decouvrir">Retour à l&apos;accueil membre</Link>
        </Button>
      </div>
    </div>
  );
}
