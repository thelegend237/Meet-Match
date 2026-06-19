"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
  Loader2,
  Gift,
} from "lucide-react";
import { confirmMatchingPayment } from "@/lib/actions/matches";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { matchStatusLabels } from "@/lib/admin/labels";
import { formatCurrency } from "@/lib/utils";
import type { UserMatch } from "@/lib/types/database";
import type { MatchingCreditsStatus } from "@/lib/user/matching-credits";
import { MONTHLY_FREE_MATCHES } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface MatchesListProps {
  matches: UserMatch[];
  matchingCredits?: MatchingCreditsStatus;
}

function statusVariant(
  status: string
): "default" | "secondary" | "success" | "warning" | "outline" {
  if (status === "active" || status === "success") return "success";
  if (status === "pending_payment" || status === "pending") return "warning";
  if (status === "failed" || status === "cancelled") return "outline";
  return "default";
}

function MatchCard({
  match,
  matchingCredits,
}: {
  match: UserMatch;
  matchingCredits?: MatchingCreditsStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [localPaymentDone, setLocalPaymentDone] = useState(false);

  const needsPayment =
    match.status === "pending_payment" &&
    match.myPayment?.status === "unpaid";
  const needsPaymentLocal = needsPayment && !localPaymentDone;

  const coveredByCredit =
    match.status === "pending_payment" &&
    match.myPayment?.status === "free";

  const waitingPartner =
    match.status === "pending_payment" &&
    !coveredByCredit &&
    (localPaymentDone ||
      (match.myPayment && ["paid", "free"].includes(match.myPayment.status))) &&
    !match.partnerHasPaid;

  function handlePay() {
    if (!match.myPayment) return;
    if (
      !confirm(
        `Confirmer le paiement de ${formatCurrency(match.myPayment.amount, match.myPayment.currency)} pour ce match ?\n\n(Mode test — Stripe à l'étape 8)`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await confirmMatchingPayment(match.myPayment!.id);
      if (result.error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
      } else {
        toast({
          title: "Paiement enregistré",
          description:
            "Votre paiement a été pris en compte. Le match sera activé lorsque les deux parties auront payé.",
        });
        setLocalPaymentDone(true);
      }
    });
  }

  return (
    <article
      id={`match-${match.id}`}
      className="mm-card overflow-hidden p-0"
    >
      <div className="flex gap-4 p-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          {match.partner.primary_photo_url ? (
            <Image
              src={match.partner.primary_photo_url}
              alt={match.partner.display_name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Photo
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-primary">
                {match.partner.display_name}
              </h3>
              {match.partner.city && (
                <p className="text-sm text-muted-foreground">
                  {match.partner.city}
                </p>
              )}
            </div>
            <Badge variant={statusVariant(match.status)}>
              {matchStatusLabels[match.status] ?? match.status}
            </Badge>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            Proposé le{" "}
            {new Date(match.proposed_at).toLocaleDateString("fr-FR")}
          </p>
        </div>
      </div>

      <div className="border-t border-border bg-muted/30 px-4 py-3">
        {match.status === "pending_payment" && coveredByCredit && !match.partnerHasPaid && (
          <div className="flex items-start gap-2 text-sm text-secondary">
            <Gift className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Ce match est inclus dans votre forfait mensuel.
              {matchingCredits
                ? ` Il vous reste ${matchingCredits.remainingThisMonth} crédit(s) gratuit(s) ce mois.`
                : ""}{" "}
              En attente du paiement de {match.partner.display_name.split(" ")[0]}.
            </span>
          </div>
        )}

        {match.status === "pending_payment" && coveredByCredit && match.partnerHasPaid && (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Match inclus — activation en cours.
          </div>
        )}

        {match.status === "pending_payment" && needsPaymentLocal && match.myPayment && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Un administrateur vous propose ce match. Payez les frais de mise en
              relation pour continuer.
            </p>
            <Button
              variant="secondary"
              className="w-full"
              disabled={pending}
              onClick={handlePay}
            >
              {pending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Payer {formatCurrency(match.myPayment.amount, match.myPayment.currency)}
            </Button>
          </div>
        )}

        {waitingPartner && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0 text-secondary" />
            Paiement reçu — en attente du paiement de{" "}
            {match.partner.display_name.split(" ")[0]}.
          </div>
        )}

        {match.status === "active" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Match actif — mise en relation confirmée
            </div>
            {match.chat_id ? (
              <Button variant="secondary" className="w-full" asChild>
                <Link href={`/messages/${match.chat_id}`}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Ouvrir la discussion
                </Link>
              </Button>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <MessageCircle className="h-4 w-4" />
                Discussion en cours de création.{" "}
                <Link href="/contact" className="text-secondary hover:underline">
                  Contactez-nous
                </Link>{" "}
                si le problème persiste.
              </p>
            )}
          </div>
        )}

        {match.status === "success" && (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <Heart className="h-4 w-4 fill-current" />
            Félicitations — cette mise en relation a abouti.
          </div>
        )}

        {(match.status === "failed" || match.status === "cancelled") && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <XCircle className="h-4 w-4" />
              {match.status === "failed"
                ? "Ce match n'a pas abouti. Nous continuons à chercher pour vous."
                : "Ce match a été annulé."}
            </div>
            {matchingCredits?.hasEverPaidMatching && (
              <p className="text-xs text-muted-foreground">
                Votre prochain match peut utiliser un crédit gratuit ({matchingCredits.remainingThisMonth} / {MONTHLY_FREE_MATCHES} restants ce mois).
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function MatchesList({ matches, matchingCredits }: MatchesListProps) {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("match");

  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`match-${highlightId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlightId]);

  const active = matches.filter((m) =>
    ["pending_payment", "pending", "active"].includes(m.status)
  );
  const closed = matches.filter((m) =>
    ["success", "failed", "cancelled"].includes(m.status)
  );

  if (matches.length === 0) {
    return (
      <div className="mm-card flex flex-col items-center px-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
          <Heart className="h-8 w-8 text-secondary/70" />
        </div>
        <p className="mt-5 font-sans text-xl font-bold text-primary">
          Aucun match pour le moment
        </p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Likez des profils dans Découvrir. Lorsqu&apos;un administrateur vous
          proposera une mise en relation, elle apparaîtra ici.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {active.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-primary">En cours</h2>
          <div className="space-y-4">
            {active.map((match) => (
              <div
                key={match.id}
                id={`match-${match.id}`}
                className={cn(
                  highlightId === match.id &&
                    "rounded-2xl ring-2 ring-secondary ring-offset-2"
                )}
              >
                <MatchCard match={match} matchingCredits={matchingCredits} />
              </div>
            ))}
          </div>
        </section>
      )}

      {closed.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold text-primary">Historique</h2>
          <div className="space-y-4">
            {closed.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                matchingCredits={matchingCredits}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
