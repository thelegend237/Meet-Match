"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  getChargeMatchingFee,
  getChargeRegistrationFee,
  getStaffPaymentTestFee,
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
import {
  getConfiguredPaymentMethods,
  hasAnyPaymentProvider,
  paymentMethodToProvider,
  resolveCheckoutMethod,
  type PaymentMethodId,
} from "@/lib/payments/providers";
import { createPayPalOrder } from "@/lib/payments/paypal";
import { initViaziPayPayment } from "@/lib/payments/viazipay";
import { isStaffRole } from "@/lib/auth/staff";

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

export type CheckoutOptions = {
  method?: PaymentMethodId;
};

export async function listAvailablePaymentMethods() {
  return getConfiguredPaymentMethods().map((m) => ({
    id: m.id,
    label: m.label,
    description: m.description,
    provider: m.provider,
  }));
}

/** Activation gratuite (phase test / offre lancement) ou simulation manuelle sans provider. */
export async function confirmRegistrationPayment() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const complimentary = isRegistrationWaived();

  if (hasAnyPaymentProvider() && !complimentary && !PRICING_TEST_MODE) {
    return {
      error:
        "Le paiement est requis. Utilisez le bouton Payer pour continuer.",
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
 * Démarre le checkout inscription selon le moyen choisi
 * (stripe | paypal | viazipay via mtn/orange).
 */
export async function startRegistrationCheckout(options?: CheckoutOptions) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id, email, country_code, registration_payment_status, display_name, trial_ends_at"
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: profileError?.message ?? "Profil introuvable" };
  }

  if (profile.registration_payment_status === "paid") {
    return { error: "Inscription déjà activée" };
  }

  const convertingTrial =
    profile.registration_payment_status === "free" &&
    Boolean(profile.trial_ends_at);

  if (profile.registration_payment_status === "free" && !convertingTrial) {
    return { error: "Inscription déjà activée" };
  }

  const fee = getChargeRegistrationFee({
    countryCode: profile.country_code,
    bypassWaive: convertingTrial,
  });

  if (PRICING_TEST_MODE || isFreeFee(fee.amount) || !hasAnyPaymentProvider()) {
    const result = await confirmRegistrationPayment();
    if (result.error) return result;
    return { success: true as const, activated: true as const };
  }

  const method = resolveCheckoutMethod(options?.method);
  if (!method) {
    return { error: "Aucun moyen de paiement configuré" };
  }

  const provider = paymentMethodToProvider(method);
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
        provider,
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
        provider,
      })
      .select("id")
      .single();

    if (insertError || !created) {
      return { error: insertError?.message ?? "Impossible de créer le paiement" };
    }
    paymentId = created.id;
  }

  try {
    return await startProviderCheckout({
      provider,
      method,
      paymentId: paymentId!,
      amount: fee.amount,
      currency: fee.currency,
      description:
        "Frais d'inscription Meet and Match — service de rencontre accompagnee",
      customerEmail: profile.email ?? user.email ?? undefined,
      customerName: profile.display_name ?? undefined,
      successPath: "/paiements?checkout=success&type=registration",
      cancelPath: "/paiements?checkout=cancel",
      metadata: {
        payment_id: paymentId!,
        user_id: user.id,
        payment_type: "registration",
      },
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Checkout impossible",
    };
  }
}

export async function startMatchingCheckout(
  paymentId: string,
  options?: CheckoutOptions
) {
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

  const { data: payerProfile } = await supabase
    .from("profiles")
    .select("email, display_name, trial_ends_at, registration_payment_status")
    .eq("id", user.id)
    .single();

  const onTrial =
    payerProfile?.registration_payment_status === "free" &&
    payerProfile.trial_ends_at &&
    new Date(payerProfile.trial_ends_at).getTime() > Date.now();

  if (
    PRICING_TEST_MODE ||
    isFreeFee(amount) ||
    onTrial ||
    !hasAnyPaymentProvider()
  ) {
    const { error } = await supabase.rpc("confirm_matching_payment", {
      p_payment_id: paymentId,
    });
    if (error) return { error: error.message };
    revalidatePath("/matchs");
    revalidatePath("/notifications");
    revalidatePath("/paiements");
    return { success: true as const, activated: true as const };
  }

  const method = resolveCheckoutMethod(options?.method);
  if (!method) {
    return { error: "Aucun moyen de paiement configuré" };
  }

  const provider = paymentMethodToProvider(method);

  try {
    return await startProviderCheckout({
      provider,
      method,
      paymentId: payment.id,
      amount,
      currency: "USD",
      description:
        "Frais de mise en relation Meet and Match — service de rencontre accompagnee",
      customerEmail: payerProfile?.email ?? user.email ?? undefined,
      customerName: payerProfile?.display_name ?? undefined,
      successPath: `/matchs?checkout=success&match=${payment.match_id ?? ""}`,
      cancelPath: "/matchs?checkout=cancel",
      metadata: {
        payment_id: payment.id,
        user_id: user.id,
        payment_type: "matching",
        match_id: payment.match_id ?? "",
      },
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Checkout impossible",
    };
  }
}

async function startProviderCheckout(params: {
  provider: ReturnType<typeof paymentMethodToProvider>;
  method: PaymentMethodId;
  paymentId: string;
  amount: number;
  currency: string;
  description: string;
  customerEmail?: string;
  customerName?: string;
  successPath: string;
  cancelPath: string;
  metadata: Record<string, string>;
}) {
  const supabase = await createClient();

  if (params.provider === "stripe") {
    if (!shouldUseStripeCheckout()) {
      return { error: "Stripe n'est pas configuré" };
    }

    const stripe = getStripe();
    const appUrl = getAppUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: params.customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: params.currency.toLowerCase(),
            unit_amount: toStripeAmount(params.amount),
            product_data: {
              name: params.description,
              description:
                params.metadata.payment_type === "registration"
                  ? "Accès complet : découverte, likes et mise en relation."
                  : "Mise en relation accompagnée proposée par l'équipe.",
            },
          },
        },
      ],
      metadata: params.metadata,
      success_url: `${appUrl}${params.successPath}`,
      cancel_url: `${appUrl}${params.cancelPath}`,
    });

    await supabase
      .from("payments")
      .update({
        provider: "stripe",
        currency: params.currency.toUpperCase(),
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.paymentId);

    if (!session.url) {
      return { error: "Session Stripe invalide" };
    }

    return { url: session.url };
  }

  if (params.provider === "paypal") {
    const order = await createPayPalOrder({
      paymentId: params.paymentId,
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      successPath: params.successPath,
      cancelPath: params.cancelPath,
      customId: params.paymentId,
      paymentType:
        params.metadata.payment_type === "matching"
          ? "matching"
          : "registration",
    });

    await supabase
      .from("payments")
      .update({
        provider: "paypal",
        currency: params.currency.toUpperCase(),
        provider_reference: order.orderId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.paymentId);

    return { url: order.approveUrl };
  }

  // viazipay (mtn / orange) — facturation XAF côté opérateur
  const channel = params.method === "orange" ? "orange" : "mtn";
  const init = await initViaziPayPayment({
    paymentId: params.paymentId,
    amount: params.amount,
    currency: params.currency,
    channel,
    successPath: params.successPath,
    cancelPath: params.cancelPath,
  });

  await supabase
    .from("payments")
    .update({
      provider: "viazipay",
      // On conserve la devise métier (USD) ; ViaziPay encaisse en XAF.
      currency: params.currency.toUpperCase(),
      provider_reference: init.orderId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.paymentId);

  return { url: init.paymentUrl };
}

export type StaffPaymentTestType = "registration" | "matching";

/**
 * Checkout de test réservé aux admins / superadmins.
 * Ignore l'offre de lancement et PRICING_TEST_MODE pour enchaîner un vrai paiement.
 */
export async function startStaffPaymentTestCheckout(
  type: StaffPaymentTestType,
  options?: CheckoutOptions
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, display_name, role, country_code")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return { error: profileError?.message ?? "Profil introuvable" };
  }

  if (!isStaffRole(profile.role)) {
    return { error: "Réservé à l'équipe admin" };
  }

  if (!hasAnyPaymentProvider()) {
    return { error: "Aucun moyen de paiement configuré" };
  }

  const method = resolveCheckoutMethod(options?.method);
  if (!method) {
    return { error: "Aucun moyen de paiement configuré" };
  }

  const provider = paymentMethodToProvider(method);
  const fee = getStaffPaymentTestFee(type, method);

  const { data: created, error: insertError } = await supabase
    .from("payments")
    .insert({
      user_id: user.id,
      type,
      amount: fee.amount,
      currency: fee.currency,
      status: "unpaid",
      provider,
      match_id: null,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    return {
      error: insertError?.message ?? "Impossible de créer le paiement de test",
    };
  }

  try {
    return await startProviderCheckout({
      provider,
      method,
      paymentId: created.id,
      amount: fee.amount,
      currency: fee.currency,
      description:
        type === "registration"
          ? "Test admin — adhesion Meet and Match (rencontre)"
          : "Test admin — mise en relation Meet and Match",
      customerEmail: profile.email ?? user.email ?? undefined,
      customerName: profile.display_name ?? undefined,
      successPath: `/paiements?checkout=success&type=${type}&staff_test=1`,
      cancelPath: "/paiements?checkout=cancel&staff_test=1",
      metadata: {
        payment_id: created.id,
        user_id: user.id,
        payment_type: type,
        staff_test: "1",
      },
    });
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Checkout de test impossible",
    };
  }
}

