import type { Metadata } from "next";
import ContactForm from "@/components/public/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez gratuitement un administrateur Meet & Match. Visiteurs et membres bienvenus.",
};

export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="mb-10 text-center">
        <h1 className="font-serif text-4xl font-bold text-primary">
          Contactez notre équipe
        </h1>
        <p className="mt-4 text-muted-foreground">
          Une question ? Un doute ? Écrivez-nous — c&apos;est gratuit et sans engagement.
        </p>
      </div>
      <ContactForm />
    </div>
  );
}
