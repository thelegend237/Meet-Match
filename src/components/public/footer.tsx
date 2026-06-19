import Link from "next/link";
import { Logo } from "@/components/public/logo";
import { Button } from "@/components/ui/button";
import { Mail, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

export function Footer({ landing = false }: { landing?: boolean }) {
  return (
    <footer
      className={cn(
        "border-t",
        landing
          ? "border-[#ebe6f0]/80 bg-white text-[#2e1a47]"
          : "border-border bg-primary text-primary-foreground"
      )}
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Logo showText size="sm" variant={landing ? "default" : "light"} />
            <p
              className={cn(
                "mt-4 text-sm leading-relaxed",
                landing ? "text-[#6b5f7a]" : "text-primary-foreground/80"
              )}
            >
              Rencontres sérieuses accompagnées par une équipe d&apos;administrateurs
              dédiés à votre mise en relation.
            </p>
          </div>

          <div>
            <h3 className="font-sans text-lg font-semibold">Navigation</h3>
            <ul
              className={cn(
                "mt-4 space-y-2 text-sm",
                landing ? "text-[#6b5f7a]" : "text-primary-foreground/80"
              )}
            >
              <li><Link href="/fonctionnement" className={cn(landing ? "hover:text-[#e91e8c]" : "hover:text-white", "transition-colors")}>Fonctionnement</Link></li>
              <li><Link href="/tarifs" className={cn(landing ? "hover:text-[#e91e8c]" : "hover:text-white", "transition-colors")}>Tarifs</Link></li>
              <li><Link href="/contact" className={cn(landing ? "hover:text-[#e91e8c]" : "hover:text-white", "transition-colors")}>Contact administrateur</Link></li>
              <li><Link href="/inscription" className={cn(landing ? "hover:text-[#e91e8c]" : "hover:text-white", "transition-colors")}>Créer un compte</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-sans text-lg font-semibold">Besoin d&apos;aide ?</h3>
            <p className={cn("mt-4 text-sm", landing ? "text-[#6b5f7a]" : "text-primary-foreground/80")}>
              Notre équipe est disponible pour répondre à vos questions gratuitement.
            </p>
            <Button variant="secondary" className="mt-4 shadow-md shadow-[#e91e8c]/20" asChild>
              <Link href="/contact">
                <Mail className="h-4 w-4" />
                Écrire à un administrateur
              </Link>
            </Button>
          </div>
        </div>

        <div
          className={cn(
            "mt-10 flex flex-col items-center justify-between gap-4 border-t pt-8 text-sm sm:flex-row",
            landing
              ? "border-[#ebe6f0]/80 text-[#9b8fa8]"
              : "border-primary-foreground/20 text-primary-foreground/60"
          )}
        >
          <p>&copy; {new Date().getFullYear()} Meet & Match. Tous droits réservés.</p>
          <p className="flex items-center gap-1">
            <Heart className="h-3 w-3 text-[#e91e8c]" />
            Mises en relation humaines et respectueuses
          </p>
        </div>
      </div>
    </footer>
  );
}
