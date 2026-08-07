import { formatCurrency } from "@/lib/utils";
import type { PaymentMethodId } from "@/lib/payments/providers";

/**
 * Phase test (tout gratuit) uniquement si NEXT_PUBLIC_PRICING_TEST_MODE=true.
 * En prod : omettre ou false → tarifs 5 $ / 10 $ USD (+ offre lancement possible).
 */
export const PRICING_TEST_MODE =
  process.env.NEXT_PUBLIC_PRICING_TEST_MODE === "true";

/**
 * Offre de lancement : inscription + matching gratuits jusqu'à cette date
 * (ISO YYYY-MM-DD, fin de journée UTC).
 * Ex. NEXT_PUBLIC_LAUNCH_FREE_UNTIL=2026-08-10
 */
export const LAUNCH_FREE_UNTIL =
  process.env.NEXT_PUBLIC_LAUNCH_FREE_UNTIL?.trim() || "";

export const PRICING_BETA_TITLE =
  "Version test — tous les services sont gratuits";

export const PRICING_BETA_DESCRIPTION =
  "Meet & Match est en phase de test. L'inscription, le matching et l'accompagnement sont entièrement gratuits pour le moment.";

export const LAUNCH_OFFER_TITLE = "Offre de lancement";

export type FeeAmount = {
  amount: number;
  currency: string;
};

/** Référence mondiale (Stripe charge toujours en USD). */
export const CHARGE_REGISTRATION_USD = 5;
export const CHARGE_MATCHING_USD = 10;

/** Facteur tarifaire Afrique (moitié du tarif mondial). */
export const AFRICA_PRICE_FACTOR = 0.5;

/** ISO 3166-1 alpha-2 — pays d'Afrique. */
const AFRICA_COUNTRY_CODES = new Set([
  "DZ",
  "AO",
  "BJ",
  "BW",
  "BF",
  "BI",
  "CV",
  "CM",
  "CF",
  "TD",
  "KM",
  "CG",
  "CD",
  "CI",
  "DJ",
  "EG",
  "GQ",
  "ER",
  "SZ",
  "ET",
  "GA",
  "GM",
  "GH",
  "GN",
  "GW",
  "KE",
  "LS",
  "LR",
  "LY",
  "MG",
  "MW",
  "ML",
  "MR",
  "MU",
  "MA",
  "MZ",
  "NA",
  "NE",
  "NG",
  "RW",
  "ST",
  "SN",
  "SC",
  "SL",
  "SO",
  "ZA",
  "SS",
  "SD",
  "TZ",
  "TG",
  "TN",
  "UG",
  "ZM",
  "ZW",
]);

export function isAfricaCountry(
  countryCode: string | null | undefined
): boolean {
  return AFRICA_COUNTRY_CODES.has((countryCode ?? "").toUpperCase());
}

/** Montant USD facturé selon le pays (Afrique = 50 %). */
export function usdChargeForCountry(
  baseUsd: number,
  countryCode: string | null | undefined
): number {
  const raw = isAfricaCountry(countryCode)
    ? baseUsd * AFRICA_PRICE_FACTOR
    : baseUsd;
  return Math.round(raw * 100) / 100;
}

/** Taux approximatifs USD → devise locale (affichage uniquement). */
const USD_TO_LOCAL: Record<string, number> = {
  USD: 1,
  CAD: 1.37,
  EUR: 0.92,
  XAF: 600,
  XOF: 600,
};

export type DisplayCurrency = keyof typeof USD_TO_LOCAL;

export function isLaunchFreeActive(now = new Date()): boolean {
  if (!LAUNCH_FREE_UNTIL) return false;
  const end = new Date(`${LAUNCH_FREE_UNTIL}T23:59:59.000Z`);
  if (Number.isNaN(end.getTime())) return false;
  return now.getTime() <= end.getTime();
}

/** Inscription offerte (phase test ou offre de lancement). */
export function isRegistrationWaived(now = new Date()): boolean {
  return PRICING_TEST_MODE || isLaunchFreeActive(now);
}

/** Matching offert (phase test ou offre de lancement). */
export function isMatchingWaived(now = new Date()): boolean {
  return PRICING_TEST_MODE || isLaunchFreeActive(now);
}

export function displayCurrencyForCountry(
  countryCode: string | null
): DisplayCurrency {
  const code = (countryCode ?? "").toUpperCase();
  if (code === "CA") return "CAD";
  if (code === "US") return "USD";
  if (code === "FR" || code === "BE" || code === "CH" || code === "LU") {
    return "EUR";
  }
  if (code === "CM" || code === "CI" || code === "GA" || code === "CG") {
    return "XAF";
  }
  if (code === "SN" || code === "BF" || code === "ML" || code === "TG" || code === "BJ") {
    return "XOF";
  }
  return "USD";
}

function convertFromUsd(usdAmount: number, currency: DisplayCurrency): number {
  const rate = USD_TO_LOCAL[currency] ?? 1;
  const raw = usdAmount * rate;
  if (currency === "XAF" || currency === "XOF") {
    return Math.round(raw / 50) * 50;
  }
  if (currency === "USD" || currency === "CAD" || currency === "EUR") {
    return Math.round(raw * 100) / 100;
  }
  return Math.round(raw);
}

/** Montant affiché inscription (0 si offerte). */
export function getRegistrationFee(countryCode: string | null): FeeAmount {
  if (isRegistrationWaived()) {
    const currency = displayCurrencyForCountry(countryCode);
    return { amount: 0, currency };
  }
  const currency = displayCurrencyForCountry(countryCode);
  const usd = usdChargeForCountry(CHARGE_REGISTRATION_USD, countryCode);
  return {
    amount: convertFromUsd(usd, currency),
    currency,
  };
}

/** Montant affiché matching (0 en phase test). */
export function getMatchingFee(countryCode: string | null): FeeAmount {
  if (isMatchingWaived()) {
    const currency = displayCurrencyForCountry(countryCode);
    return { amount: 0, currency };
  }
  const currency = displayCurrencyForCountry(countryCode);
  const usd = usdChargeForCountry(CHARGE_MATCHING_USD, countryCode);
  return {
    amount: convertFromUsd(usd, currency),
    currency,
  };
}

/** Montant réellement facturé (Stripe / DB) — toujours USD. */
export function getChargeRegistrationFee(opts?: {
  bypassWaive?: boolean;
  countryCode?: string | null;
}): FeeAmount {
  if (!opts?.bypassWaive && isRegistrationWaived()) {
    return { amount: 0, currency: "USD" };
  }
  return {
    amount: usdChargeForCountry(
      CHARGE_REGISTRATION_USD,
      opts?.countryCode ?? null
    ),
    currency: "USD",
  };
}

export function getChargeMatchingFee(opts?: {
  bypassWaive?: boolean;
  countryCode?: string | null;
}): FeeAmount {
  if (!opts?.bypassWaive && isMatchingWaived()) {
    return { amount: 0, currency: "USD" };
  }
  return {
    amount: usdChargeForCountry(CHARGE_MATCHING_USD, opts?.countryCode ?? null),
    currency: "USD",
  };
}

/** Minimum Stripe Checkout (USD). */
export const STAFF_TEST_MIN_STRIPE_USD = 0.5;

/** Minimum PayPal (USD). */
export const STAFF_TEST_MIN_PAYPAL_USD = 0.01;

/** ViaziPay / MoMo : plancher pratique 100 XAF — converti en USD pour la DB. */
export function staffTestMinViaziPayUsd(): number {
  const rate = Number(process.env.VIAZIPAY_USD_TO_XAF?.trim() || "600");
  const safeRate = Number.isFinite(rate) && rate > 0 ? rate : 600;
  // Aligné sur VIAZIPAY_MIN_XAF (100) dans viazipay.ts
  return Math.ceil((100 / safeRate) * 100) / 100;
}

/** Montant minimal autorisé pour un checkout de test admin (USD). */
export function getStaffPaymentTestMinUsd(
  method?: PaymentMethodId | null
): number {
  switch (method) {
    case "stripe":
      return STAFF_TEST_MIN_STRIPE_USD;
    case "paypal":
      return STAFF_TEST_MIN_PAYPAL_USD;
    case "mtn":
    case "orange":
      return staffTestMinViaziPayUsd();
    default:
      return Math.min(
        STAFF_TEST_MIN_PAYPAL_USD,
        staffTestMinViaziPayUsd(),
        STAFF_TEST_MIN_STRIPE_USD
      );
  }
}

/** Frais réels pour un paiement de test admin — toujours le minimum du provider. */
export function getStaffPaymentTestFee(
  _type: "registration" | "matching",
  method?: PaymentMethodId | null
): FeeAmount {
  return {
    amount: getStaffPaymentTestMinUsd(method),
    currency: "USD",
  };
}

/** Libellé affiché avant choix du moyen (fourchette des minimums). */
export function formatStaffPaymentTestPriceRange(): string {
  const min = getStaffPaymentTestMinUsd();
  const max = Math.max(
    STAFF_TEST_MIN_STRIPE_USD,
    STAFF_TEST_MIN_PAYPAL_USD,
    staffTestMinViaziPayUsd()
  );
  if (min === max) {
    return formatDisplayPrice(min, "USD");
  }
  return `${formatCurrency(min, "USD")}–${formatCurrency(max, "USD")}`;
}

/** @deprecated alias — tarifs de référence USD */
export const FUTURE_REGISTRATION_FEES: Record<string, FeeAmount> = {
  DEFAULT: { amount: CHARGE_REGISTRATION_USD, currency: "USD" },
  US: { amount: CHARGE_REGISTRATION_USD, currency: "USD" },
  CA: {
    amount: convertFromUsd(CHARGE_REGISTRATION_USD, "CAD"),
    currency: "CAD",
  },
};

export const FUTURE_MATCHING_FEES: Record<string, FeeAmount> = {
  DEFAULT: { amount: CHARGE_MATCHING_USD, currency: "USD" },
  US: { amount: CHARGE_MATCHING_USD, currency: "USD" },
  CA: {
    amount: convertFromUsd(CHARGE_MATCHING_USD, "CAD"),
    currency: "CAD",
  },
};

export const MONTHLY_FREE_MATCHES = 3;

export function isFreeFee(amount: number): boolean {
  return amount === 0;
}

export function formatDisplayPrice(amount: number, currency: string): string {
  if (isFreeFee(amount)) return "Gratuit";
  return formatCurrency(amount, currency);
}

export function formatDisplayPriceDetail(
  amount: number,
  currency: string
): string {
  if (isFreeFee(amount)) {
    if (PRICING_TEST_MODE) return "Gratuit pendant la phase test";
    if (isLaunchFreeActive()) return "Gratuit — offre de lancement";
    return "Gratuit";
  }
  return `${formatCurrency(amount, currency)} · paiement unique`;
}

export function formatLaunchOfferEnd(): string | null {
  if (!isLaunchFreeActive()) return null;
  try {
    return new Date(`${LAUNCH_FREE_UNTIL}T12:00:00.000Z`).toLocaleDateString(
      "fr-FR",
      { day: "numeric", month: "long", year: "numeric" }
    );
  } catch {
    return LAUNCH_FREE_UNTIL;
  }
}

export function futurePricingFootnote(
  countryCode: string | null = null
): string | null {
  const reg = getRegistrationFee(countryCode);
  const match = getMatchingFee(countryCode);
  const currency = displayCurrencyForCountry(countryCode);
  const regUsd = usdChargeForCountry(CHARGE_REGISTRATION_USD, countryCode);
  const matchUsd = usdChargeForCountry(CHARGE_MATCHING_USD, countryCode);
  if (PRICING_TEST_MODE) {
    return `Après la phase test : environ ${formatCurrency(convertFromUsd(regUsd, currency), currency)} d'inscription et ${formatCurrency(convertFromUsd(matchUsd, currency), currency)} par matching (réf. ${regUsd} $ / ${matchUsd} $ US${isAfricaCountry(countryCode) ? " · tarif Afrique" : ""}).`;
  }
  if (isLaunchFreeActive()) {
    return `Offre de lancement : inscription et matching gratuits jusqu'au ${formatLaunchOfferEnd()}. Ensuite ${formatDisplayPrice(convertFromUsd(regUsd, currency), currency)} d'inscription et ${formatDisplayPrice(convertFromUsd(matchUsd, currency), currency)} de matching${isAfricaCountry(countryCode) ? " (tarif Afrique −50 %)" : ""}.`;
  }
  return `Tarif ${isAfricaCountry(countryCode) ? "Afrique (−50 %)" : "mondial"} : ${formatDisplayPrice(reg.amount, reg.currency)} inscription · ${formatDisplayPrice(match.amount, match.currency)} matching (réf. USD).`;
}

export const REGISTRATION_BENEFITS = [
  {
    title: "Profil complet",
    description:
      "Photos, bio et préférences visibles par les membres actifs.",
  },
  {
    title: "Découverte et likes",
    description:
      "Parcourez les profils et envoyez des likes pour montrer votre intérêt.",
  },
  {
    title: "Contact humain",
    description:
      "Échangez avec l'équipe Meet & Match à tout moment.",
  },
] as const;

export const REGISTRATION_FEATURES = isRegistrationWaived()
  ? ([
      "Création et modification de profil",
      "Upload de photos",
      "Consultation des profils actifs",
      "Envoi de likes",
      PRICING_TEST_MODE
        ? "Activation gratuite pendant la phase test"
        : "Inscription offerte — offre de lancement",
    ] as const)
  : ([
      "Création et modification de profil",
      "Upload de photos",
      "Consultation des profils actifs",
      "Envoi de likes",
      "Notifications et tableau de bord",
    ] as const);

export const MATCHING_BENEFITS = isMatchingWaived()
  ? ([
      {
        title: "Matchs gratuits",
        description: PRICING_TEST_MODE
          ? "Chaque mise en relation proposée par l'équipe est gratuite pendant la phase test."
          : "Chaque mise en relation proposée par l'équipe est gratuite pendant l'offre de lancement.",
      },
      {
        title: "Accompagnement inclus",
        description:
          "Discussion encadrée avec un administrateur dès l'ouverture du match.",
      },
      {
        title: "Sans engagement",
        description: PRICING_TEST_MODE
          ? "Testez l'expérience complète avant le lancement des paiements réels."
          : "Profitez de l'expérience complète pendant l'offre de lancement.",
      },
    ] as const)
  : ([
      {
        title: "Payé à la proposition",
        description:
          "Vous ne payez que lorsqu'un administrateur vous propose un match compatible.",
      },
      {
        title: "Discussion encadrée",
        description:
          "Ouverture du chat de groupe et accompagnement Meet & Match.",
      },
      {
        title: "Crédits fidélité",
        description: `Après votre premier matching payé : ${MONTHLY_FREE_MATCHES} mises en relation gratuites par mois.`,
      },
    ] as const);

export const MATCHING_FEATURES = isMatchingWaived()
  ? ([
      "Proposition de match par un administrateur",
      PRICING_TEST_MODE
        ? "Mise en relation gratuite pendant la phase test"
        : "Mise en relation gratuite — offre de lancement",
      "Discussion groupée encadrée",
      "Accompagnement Meet & Match",
    ] as const)
  : ([
      "Proposition de match par un administrateur",
      `Frais de matching : ${CHARGE_MATCHING_USD} $ US (Afrique : ${CHARGE_MATCHING_USD * AFRICA_PRICE_FACTOR} $ US)`,
      `${MONTHLY_FREE_MATCHES} matchs gratuits / mois après le 1er paiement`,
      "Ouverture de discussion groupée encadrée",
      "Accompagnement Meet & Match",
    ] as const);

export const PLAN_COMPARISON_ROWS = [
  {
    label: "Profil, photos et préférences",
    registration: true,
    matching: true,
  },
  {
    label: "Découverte et likes",
    registration: true,
    matching: false,
  },
  {
    label: "Notifications et tableau de bord",
    registration: true,
    matching: false,
  },
  {
    label: "Contact avec l'équipe (gratuit)",
    registration: true,
    matching: true,
  },
  {
    label: "Proposition de match par un admin",
    registration: false,
    matching: true,
  },
  {
    label: "Analyse de compatibilité humaine",
    registration: false,
    matching: true,
  },
  {
    label: "Discussion groupée encadrée",
    registration: false,
    matching: true,
  },
  {
    label: "Accompagnement Meet & Match",
    registration: false,
    matching: true,
  },
] as const;

export function currencyRegionLabel(
  currency: string,
  countryCode?: string | null
): string {
  if (PRICING_TEST_MODE) return "Phase test — gratuit";
  if (isLaunchFreeActive() && currency) {
    return isAfricaCountry(countryCode)
      ? "Offre lancement · tarif Afrique (−50 %) après"
      : "Tarif mondial (offre lancement)";
  }
  const africa = isAfricaCountry(countryCode);
  switch (currency) {
    case "USD":
      return africa
        ? "Affiché en USD · tarif Afrique (−50 %)"
        : "Affiché en USD · tarif mondial";
    case "CAD":
      return "Affiché en CAD · tarif mondial";
    case "EUR":
      return "Affiché en EUR · tarif mondial";
    case "XAF":
      return africa
        ? "Affiché en FCFA (XAF) · tarif Afrique (−50 %)"
        : "Affiché en FCFA (XAF) · tarif mondial";
    case "XOF":
      return africa
        ? "Affiché en FCFA (XOF) · tarif Afrique (−50 %)"
        : "Affiché en FCFA (XOF) · tarif mondial";
    default:
      return africa ? "Tarif Afrique (−50 %)" : "Tarif mondial";
  }
}
