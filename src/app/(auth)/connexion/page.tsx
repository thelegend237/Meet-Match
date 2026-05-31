import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ConnexionForm } from "@/components/auth/connexion-form";

export default function ConnexionPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          </div>
        }
      >
        <ConnexionForm />
      </Suspense>
    </div>
  );
}
