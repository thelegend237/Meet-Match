import { formatCurrency } from "@/lib/utils";

/**
 * Phase test (tout gratuit) uniquement si NEXT_PUBLIC_PRICING_TEST_MODE=true.
 * En prod : omettre ou false → tarifs 5 $ / 10 $ USD (+ offre lancement possible).
 */
export const PRICING_TEST_MODE =
  process.env.NEXT_PUBLIC_PRICING_TEST_MODE === "true";

/**
 * Offre de lancement : inscription gratuite jusqu'à cette date (ISO YYYY-MM-DD, fin de journée UTC).
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

/** Matching offert uniquement en phase test. */
export function isMatchingWaived(): boolean {
  return PRICING_TEST_MODE;
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
  return {
    amount: convertFromUsd(CHARGE_REGISTRATION_USD, currency),
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
  return {
    amount: convertFromUsd(CHARGE_MATCHING_USD, currency),
    currency,
  };
}

/** Montant réellement facturé (Stripe / DB) — toujours USD. */
export function getChargeRegistrationFee(): FeeAmount {
  if (isRegistrationWaived()) return { amount: 0, currency: "USD" };
  return { amount: CHARGE_REGISTRATION_USD, currency: "USD" };
}

export function getChargeMatchingFee(): FeeAmount {
  if (isMatchingWaived()) return { amount: 0, currency: "USD" };
  return { amount: CHARGE_MATCHING_USD, currency: "USD" };
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
  if (PRICING_TEST_MODE) {
    return `Après la phase test : environ ${formatCurrency(convertFromUsd(CHARGE_REGISTRATION_USD, displayCurrencyForCountry(countryCode)), displayCurrencyForCountry(countryCode))} d'inscription et ${formatCurrency(convertFromUsd(CHARGE_MATCHING_USD, displayCurrencyForCountry(countryCode)), displayCurrencyForCountry(countryCode))} par matching (réf. ${CHARGE_REGISTRATION_USD} $ / ${CHARGE_MATCHING_USD} $ US).`;
  }
  if (isLaunchFreeActive()) {
    return `Offre de lancement : inscription gratuite jusqu'au ${formatLaunchOfferEnd()}. Ensuite ${formatDisplayPrice(convertFromUsd(CHARGE_REGISTRATION_USD, displayCurrencyForCountry(countryCode)), displayCurrencyForCountry(countryCode))}. Matching : ${formatDisplayPrice(match.amount, match.currency)} lorsqu'un admin vous propose une rencontre.`;
  }
  return `Tarif mondial : ${formatDisplayPrice(reg.amount, reg.currency)} inscription · ${formatDisplayPrice(match.amount, match.currency)} matching (réf. USD).`;
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
        description:
          "Chaque mise en relation proposée par l'équipe est gratuite pendant la phase test.",
      },
      {
        title: "Accompagnement inclus",
        description:
          "Discussion encadrée avec un administrateur dès l'ouverture du match.",
      },
      {
        title: "Sans engagement",
        description:
          "Testez l'expérience complète avant le lancement des paiements réels.",
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
      "Mise en relation gratuite pendant la phase test",
      "Discussion groupée encadrée",
      "Accompagnement Meet & Match",
    ] as const)
  : ([
      "Proposition de match par un administrateur",
      `Frais de matching : ${CHARGE_MATCHING_USD} $ US (affiché en devise locale)`,
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

export function currencyRegionLabel(currency: string): string {
  if (PRICING_TEST_MODE) return "Phase test — gratuit";
  if (isLaunchFreeActive() && currency) {
    return "Tarif mondial (offre lancement)";
  }
  switch (currency) {
    case "USD":
      return "Affiché en USD · tarif mondial";
    case "CAD":
      return "Affiché en CAD · tarif mondial";
    case "EUR":
      return "Affiché en EUR · tarif mondial";
    case "XAF":
      return "Affiché en FCFA (XAF) · tarif mondial";
    case "XOF":
      return "Affiché en FCFA (XOF) · tarif mondial";
    default:
      return "Tarif mondial";
  }
}
