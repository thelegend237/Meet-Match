import { HelpCircle } from "lucide-react";
import { USER_FAQ_ITEMS } from "@/lib/content/user-faq";
import { cn } from "@/lib/utils";

type UserFaqSectionProps = {
  className?: string;
  title?: string;
  description?: string;
};

export function UserFaqSection({
  className,
  title = "Questions fréquentes",
  description = "Tout ce qu'il faut savoir avant de commencer — parcours gratuit, paiements et mises en relation.",
}: UserFaqSectionProps) {
  return (
    <section className={cn("mt-12", className)}>
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#fce7f3]">
          <HelpCircle className="h-6 w-6 text-[#e91e8c]" />
        </div>
        <h2 className="mm-landing-title text-2xl sm:text-3xl">{title}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-[#6b5f7a] sm:text-base">
          {description}
        </p>
      </div>

      <div className="mt-8 space-y-3">
        {USER_FAQ_ITEMS.map((item) => (
          <details
            key={item.id}
            className="group mm-landing-card overflow-hidden [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-left font-sans text-base font-semibold text-[#2e1a47] transition-colors hover:text-[#e91e8c] sm:p-6 sm:text-[17px]">
              <span>{item.question}</span>
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fce7f3]/80 text-lg leading-none text-[#e91e8c] transition-transform group-open:rotate-45"
                aria-hidden
              >
                +
              </span>
            </summary>
            <div className="border-t border-[#f0c4dc]/40 px-5 pb-5 pt-4 text-sm leading-relaxed text-[#6b5f7a] sm:px-6 sm:pb-6 sm:text-[15px]">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
