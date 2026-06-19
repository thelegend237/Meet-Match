import type { Metadata } from "next";
import { ContactPageView } from "@/components/public/contact-page-view";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contactez gratuitement un administrateur Meet & Match. Visiteurs et membres bienvenus.",
};

export const dynamic = "force-dynamic";

export default function ContactPage() {
  return <ContactPageView />;
}
