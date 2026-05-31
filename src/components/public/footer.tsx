import Link from "next/link";
import { Logo } from "@/components/public/logo";
import { Button } from "@/components/ui/button";
import { Mail, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Logo showText={true} size="sm" className="[&_span]:text-white [&_.text-secondary]:text-pink-300" />
            <p className="mt-4 text-sm text-primary-foreground/80 leading-relaxed">
              Rencontres sérieuses accompagnées par une équipe d&apos;administrateurs
              dédiés à votre mise en relation.
            </p>
          </div>

          <div>
            <h3 className="font-serif text-lg font-semibold">Navigation</h3>
            <ul className="mt-4 space-y-2 text-sm text-primary-foreground/80">
              <li><Link href="/fonctionnement" className="hover:text-white transition-colors">Fonctionnement</Link></li>
              <li><Link href="/tarifs" className="hover:text-white transition-colors">Tarifs</Link></li>
              <li><Link href="/contact" className="hover:text-white transition-colors">Contact administrateur</Link></li>
              <li><Link href="/inscription" className="hover:text-white transition-colors">Créer un compte</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-serif text-lg font-semibold">Besoin d&apos;aide ?</h3>
            <p className="mt-4 text-sm text-primary-foreground/80">
              Notre équipe est disponible pour répondre à vos questions gratuitement.
            </p>
            <Button variant="secondary" className="mt-4" asChild>
              <Link href="/contact">
                <Mail className="h-4 w-4" />
                Écrire à un administrateur
              </Link>
            </Button>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-primary-foreground/20 pt-8 text-sm text-primary-foreground/60 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Meet & Match. Tous droits réservés.</p>
          <p className="flex items-center gap-1">
            <Heart className="h-3 w-3 text-secondary" />
            Mises en relation humaines et respectueuses
          </p>
        </div>
      </div>
    </footer>
  );
}
