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
import {
  PaymentMethodPicker,
  resolvePaymentMethodForCheckout,
} from "@/components/user/payment-method-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { matchStatusLabels } from "@/lib/admin/labels";
import type { PaymentMethodId } from "@/lib/payments/providers";
import { formatDisplayPrice, isFreeFee, PRICING_TEST_MODE } from "@/lib/pricing";
import { cn } from "@/lib/utils";
import type { UserMatch } from "@/lib/types/database";
import type { MatchingCreditsStatus } from "@/lib/user/matching-credits";
import { toast } from "@/hooks/use-toast";

interface MatchesListProps {
  matches: UserMatch[];
  matchingCredits?: MatchingCreditsStatus;
  likesSent?: number;
  profileCompletion?: number;
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
  const [pickerOpen, setPickerOpen] = useState(false);

  const needsPayment =
    match.status === "pending_payment" &&
    match.myPayment?.status === "unpaid";
  const needsPaymentLocal = needsPayment && !localPaymentDone;

  const isExemptFromPayment =
    match.status === "pending_payment" &&
    match.myPayment?.status === "free" &&
    match.myPayment &&
    isFreeFee(match.myPayment.amount);

  const waitingPartner =
    match.status === "pending_payment" &&
    !needsPaymentLocal &&
    (localPaymentDone ||
      (match.myPayment && ["paid", "free"].includes(match.myPayment.status))) &&
    !match.partnerHasPaid;

  function runCheckout(method?: PaymentMethodId) {
    if (!match.myPayment) return;
    const free = isFreeFee(match.myPayment.amount);
    startTransition(async () => {
      const result = await confirmMatchingPayment(
        match.myPayment!.id,
        method ? { method } : undefined
      );
      if ("error" in result && result.error) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error,
        });
        return;
      }
      if ("url" in result && result.url) {
        window.location.assign(result.url);
        return;
      }
      toast({
        title: free ? "Match confirmé gratuitement" : "Paiement enregistré",
        description: free
          ? "Votre match sera activé lorsque les deux parties auront confirmé."
          : "Votre paiement a été pris en compte. Le match sera activé lorsque les deux parties auront payé.",
      });
      setLocalPaymentDone(true);
    });
  }

  function handlePay() {
    if (!match.myPayment) return;
    const { amount, currency } = match.myPayment;
    const priceLabel = formatDisplayPrice(amount, currency);
    const free = isFreeFee(amount);
    const message = free
      ? "Confirmer ce match gratuitement ?\n\nAucun paiement ne sera demandé pendant la phase test."
      : PRICING_TEST_MODE
        ? `Confirmer le paiement de ${priceLabel} pour ce match ?\n\n(Mode test — paiement simulé)`
        : `Payer ${priceLabel} pour ce match. Continuer ?`;

    if (!confirm(message)) {
      return;
    }

    if (free || PRICING_TEST_MODE) {
      runCheckout();
      return;
    }

    startTransition(async () => {
      const method = await resolvePaymentMethodForCheckout(() => {
        setPickerOpen(true);
      });
      if (method) {
        runCheckout(method);
      }
    });
  }

  return (
    <article
      id={`match-${match.id}`}
      className="mm-card overflow-hidden p-0"
    >
      <div className="flex gap-4 p-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-20 sm:w-20">
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
        {match.status === "pending_payment" && isExemptFromPayment && !match.partnerHasPaid && (
          <div className="flex items-start gap-2 text-sm text-secondary">
            <Gift className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Vous n&apos;avez pas de frais à payer pour ce match (like reçu).
              En attente du paiement de {match.partner.display_name.split(" ")[0]}.
            </span>
          </div>
        )}

        {match.status === "pending_payment" && isExemptFromPayment && match.partnerHasPaid && (
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Paiement du liker reçu — activation en cours.
          </div>
        )}

        {match.status === "pending_payment" && needsPaymentLocal && match.myPayment && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {PRICING_TEST_MODE && match.myPayment && isFreeFee(match.myPayment.amount)
                ? "Un administrateur vous propose ce match. Confirmez gratuitement pour continuer — aucun paiement en phase test."
                : "Un administrateur vous propose ce match. Payez les frais de mise en relation pour continuer."}
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
              {match.myPayment && isFreeFee(match.myPayment.amount)
                ? "Confirmer gratuitement"
                : `Payer ${formatDisplayPrice(match.myPayment!.amount, match.myPayment!.currency)}`}
            </Button>
            <PaymentMethodPicker
              open={pickerOpen}
              onClose={() => setPickerOpen(false)}
              amountLabel={formatDisplayPrice(
                match.myPayment.amount,
                match.myPayment.currency
              )}
              onSelect={(method) => {
                setPickerOpen(false);
                runCheckout(method);
              }}
            />
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
            {match.status === "failed" && (
              <p className="text-xs text-muted-foreground">
                Un futur match proposé fera l&apos;objet de nouveaux frais de
                matching (service à la mise en relation).
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function MatchesList({
  matches,
  matchingCredits,
  likesSent = 0,
  profileCompletion = 100,
}: MatchesListProps) {
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
    const analyzing = likesSent > 0;
    return (
      <div className="mm-card flex flex-col items-center px-5 py-8 text-center sm:px-6 sm:py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
          <Heart className="h-8 w-8 text-secondary/70" />
        </div>
        <p className="mt-5 font-sans text-xl font-bold text-primary">
          {analyzing
            ? "Dossier en cours d'analyse"
            : "Aucun match pour le moment"}
        </p>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {analyzing
            ? `${likesSent} like${likesSent > 1 ? "s" : ""} envoyé${likesSent > 1 ? "s" : ""} — l'équipe analyse les compatibilités. Une mise en relation apparaîtra ici lorsqu'un administrateur valide un duo.`
            : "Likez des profils dans Découvrir. Lorsqu'un administrateur vous proposera une mise en relation, elle apparaîtra ici."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="secondary" className="rounded-full" asChild>
            <Link href="/decouvrir">Continuer à liker</Link>
          </Button>
          {analyzing && profileCompletion < 80 && (
            <Button variant="outline" className="rounded-full" asChild>
              <Link href="/profil/modifier">Compléter mon profil</Link>
            </Button>
          )}
          {analyzing && (
            <Button variant="outline" className="rounded-full" asChild>
              <Link href="/contact">Contacter l&apos;équipe</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-8">
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
