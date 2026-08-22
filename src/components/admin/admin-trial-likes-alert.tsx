import Link from "next/link";
import { Gift, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TrialLikesQueueItem } from "@/lib/admin/trial-likes-queue";

export function AdminTrialLikesAlert({
  items,
}: {
  items: TrialLikesQueueItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section
      role="status"
      className="rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-white to-amber-50/60 p-5 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <Gift className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-sans text-base font-bold text-primary sm:text-lg">
              Essai + likes non traités
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length} membre{items.length > 1 ? "s" : ""} en essai avec
              des likes envoyés et aucun match ouvert — priorisez une proposition
              pour limiter le churn.
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" className="shrink-0 rounded-full" asChild>
          <Link href="/admin/matchs?tab=proposer">Proposer un match</Link>
        </Button>
      </div>

      <ul className="mt-4 divide-y divide-amber-100/80 rounded-xl border border-amber-100 bg-white/70">
        {items.slice(0, 6).map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
          >
            <div className="min-w-0">
              <Link
                href={`/admin/utilisateurs/${item.id}`}
                className="font-semibold text-primary hover:underline"
              >
                {item.display_name}
              </Link>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Heart className="h-3 w-3 text-secondary" />
                  {item.likes_sent} like{item.likes_sent > 1 ? "s" : ""}
                </span>
                <span>Profil {item.profile_completion}%</span>
                <span>
                  Essai : {item.days_left} j. restant
                  {item.days_left > 1 ? "s" : ""}
                </span>
              </p>
            </div>
            <Button variant="outline" size="sm" className="rounded-full" asChild>
              <Link href={`/admin/matchs?tab=proposer&user=${item.id}`}>
                Matcher
              </Link>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
