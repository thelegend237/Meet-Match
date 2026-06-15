import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ConnexionForm } from "@/components/auth/connexion-form";

export default function ConnexionPage() {
  return (
    <AuthPageShell footer={null}>
      <Suspense
        fallback={
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-secondary" />
          </div>
        }
      >
        <ConnexionForm />
      </Suspense>
    </AuthPageShell>
  );
}
