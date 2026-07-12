"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getChargeRegistrationFee,
  isFreeFee,
  isRegistrationWaived,
  PRICING_TEST_MODE,
} from "@/lib/pricing";
import {
  getAppUrl,
  getStripe,
  shouldUseStripeCheckout,
  toStripeAmount,
} from "@/lib/stripe";

function revalidatePaymentPaths() {
  revalidatePath("/paiements");
  revalidatePath("/decouvrir");
  revalidatePath("/rencontres");
  revalidatePath("/matchs");
  revalidatePath("/tableau-de-bord");
  revalidatePath("/profil");
  revalidatePath("/onboarding");
  revalidatePath("/inscription");
}

/** Activation gratuite (phase test / offre lancement) ou simulation manuelle sans Stripe. */
export async function confirmRegistrationPayment() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const complimentary = isRegistrationWaived();

  if (shouldUseStripeCheckout() && !complimentary) {
    return {
      error:
        "Le paiement Stripe est requis. Utilisez le bouton Payer pour continuer.",
    };
  }

  const { error } = await supabase.rpc("confirm_registration_payment", {
    p_as_complimentary: complimentary,
  });

  if (error) return { error: error.message };

  revalidatePaymentPaths();
  return { success: true as const };
}

/**
 * Crée une session Stripe Checkout pour les frais d'inscription (toujours USD).
 * Offre lancement / phase test / sans Stripe : activation complimentary.
 */
export async function startRegistrationCheckout() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, country_code, registration_payment_status")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: profileError?.message ?? "Profil introuvable" };
  }

  if (
    profile.registration_payment_status === "paid" ||
    profile.registration_payment_status === "free"
  ) {
    return { error: "Inscription déjà activée" };
  }

  const fee = getChargeRegistrationFee();

  if (PRICING_TEST_MODE || isFreeFee(fee.amount) || !shouldUseStripeCheckout()) {
    const result = await confirmRegistrationPayment();
    if (result.error) return result;
    return { success: true as const, activated: true as const };
  }

  let paymentId: string | null = null;

  const { data: existing } = await supabase
    .from("payments")
    .select("id, amount, currency, status")
    .eq("user_id", user.id)
    .eq("type", "registration")
    .in("status", ["unpaid", "failed"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    paymentId = existing.id;
    await supabase
      .from("payments")
      .update({
        amount: fee.amount,
        currency: fee.currency,
        status: "unpaid",
        provider: "stripe",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    const { data: created, error: insertError } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        type: "registration",
        amount: fee.amount,
        currency: fee.currency,
        status: "unpaid",
        provider: "stripe",
      })
      .select("id")
      .single();

    if (insertError || !created) {
      return { error: insertError?.message ?? "Impossible de créer le paiement" };
    }
    paymentId = created.id;
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: profile.email ?? user.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: fee.currency.toLowerCase(),
          unit_amount: toStripeAmount(fee.amount),
          product_data: {
            name: "Frais d'inscription Meet & Match",
            description: "Accès complet : découverte, likes et mise en relation.",
          },
        },
      },
    ],
    metadata: {
      payment_id: paymentId!,
      user_id: user.id,
      payment_type: "registration",
    },
    success_url: `${appUrl}/paiements?checkout=success&type=registration`,
    cancel_url: `${appUrl}/paiements?checkout=cancel`,
  });

  await supabase
    .from("payments")
    .update({
      stripe_session_id: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId!);

  if (!session.url) {
    return { error: "Session Stripe invalide" };
  }

  return { url: session.url };
}

export async function startMatchingCheckout(paymentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: payment, error: payError } = await supabase
    .from("payments")
    .select("id, user_id, type, amount, currency, status, match_id")
    .eq("id", paymentId)
    .single();

  if (payError || !payment) {
    return { error: payError?.message ?? "Paiement introuvable" };
  }

  if (payment.user_id !== user.id) {
    return { error: "Non autorisé" };
  }

  if (payment.type !== "matching") {
    return { error: "Type de paiement invalide" };
  }

  if (payment.status !== "unpaid" && payment.status !== "failed") {
    return { error: "Paiement déjà traité" };
  }

  const amount = Number(payment.amount);

  if (PRICING_TEST_MODE || isFreeFee(amount) || !shouldUseStripeCheckout()) {
    const { error } = await supabase.rpc("confirm_matching_payment", {
      p_payment_id: paymentId,
    });
    if (error) return { error: error.message };
    revalidatePath("/matchs");
    revalidatePath("/notifications");
    revalidatePath("/paiements");
    return { success: true as const, activated: true as const };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  const stripe = getStripe();
  const appUrl = getAppUrl();

  // Toujours facturer en USD (montant déjà stocké en USD à la proposition).
  const chargeCurrency = "usd";
  const chargeAmount = amount;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: profile?.email ?? user.email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: chargeCurrency,
          unit_amount: toStripeAmount(chargeAmount),
          product_data: {
            name: "Frais de matching Meet & Match",
            description: "Mise en relation accompagnée proposée par l'équipe.",
          },
        },
      },
    ],
    metadata: {
      payment_id: payment.id,
      user_id: user.id,
      payment_type: "matching",
      match_id: payment.match_id ?? "",
    },
    success_url: `${appUrl}/matchs?checkout=success&match=${payment.match_id ?? ""}`,
    cancel_url: `${appUrl}/matchs?checkout=cancel`,
  });

  await supabase
    .from("payments")
    .update({
      provider: "stripe",
      currency: "USD",
      stripe_session_id: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  if (!session.url) {
    return { error: "Session Stripe invalide" };
  }

  return { url: session.url };
}
