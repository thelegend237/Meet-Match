"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { ContactForm } from "@/components/public/contact-form";

export type ContactFormProfile = {
  display_name: string | null;
  email: string;
  phone: string | null;
} | null;

function ContactFormFallback() {
  return (
    <div className="flex justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-[#e91e8c]" />
    </div>
  );
}

/** Client boundary pour useSearchParams + formulaire contact. */
export function ContactFormWrapper({
  profile = null,
}: {
  profile?: ContactFormProfile;
}) {
  return (
    <Suspense fallback={<ContactFormFallback />}>
      <ContactForm profile={profile} />
    </Suspense>
  );
}
