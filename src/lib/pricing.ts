import { formatCurrency } from "@/lib/utils";

/** Phase test : tous les services affichés et facturés à 0 $ — repasser à false avec les vrais tarifs au lancement Stripe. */
export const PRICING_TEST_MODE = true;

export const PRICING_BETA_TITLE =
  "Version test — tous les services sont gratuits";

export const PRICING_BETA_DESCRIPTION =
  "Meet & Match est en phase de test. L'inscription, le matching et l'accompagnement sont entièrement gratuits pour le moment. Les tarifs affichés plus bas seront activés lors de l'intégration des paiements réels.";

export type FeeAmount = {
  amount: number;
  currency: string;
};

/** Tarifs prévus après la phase test (référence interne / pied de page). */
export const FUTURE_REGISTRATION_FEES: Record<string, FeeAmount> = {
  CA: { amount: 42, currency: "CAD" },
  US: { amount: 32, currency: "USD" },
  DEFAULT: { amount: 42, currency: "CAD" },
};

export const FUTURE_MATCHING_FEES: Record<string, FeeAmount> = {
  CA: { amount: 72, currency: "CAD" },
  US: { amount: 55, currency: "USD" },
  DEFAULT: { amount: 72, currency: "CAD" },
};

const REGISTRATION_FEES = PRICING_TEST_MODE
  ? {
      CA: { amount: 0, currency: "CAD" },
      US: { amount: 0, currency: "USD" },
      DEFAULT: { amount: 0, currency: "CAD" },
    }
  : FUTURE_REGISTRATION_FEES;

const MATCHING_FEES = PRICING_TEST_MODE
  ? {
      CA: { amount: 0, currency: "CAD" },
      US: { amount: 0, currency: "USD" },
      DEFAULT: { amount: 0, currency: "CAD" },
    }
  : FUTURE_MATCHING_FEES;

export const MONTHLY_FREE_MATCHES = 3;

export function getRegistrationFee(countryCode: string | null): FeeAmount {
  if (countryCode === "CA") return REGISTRATION_FEES.CA;
  if (countryCode === "US") return REGISTRATION_FEES.US;
  return REGISTRATION_FEES.DEFAULT;
}

export function getMatchingFee(countryCode: string | null): FeeAmount {
  if (countryCode === "CA") return MATCHING_FEES.CA;
  if (countryCode === "US") return MATCHING_FEES.US;
  return MATCHING_FEES.DEFAULT;
}

export function isFreeFee(amount: number): boolean {
  return amount === 0;
}

export function formatDisplayPrice(amount: number, currency: string): string {
  if (isFreeFee(amount)) return "Gratuit";
  return formatCurrency(amount, currency);
}

export function formatDisplayPriceDetail(amount: number, currency: string): string {
  if (isFreeFee(amount)) {
    return PRICING_TEST_MODE
      ? "Gratuit pendant la phase test"
      : "Gratuit";
  }
  return `${formatCurrency(amount, currency)} · paiement unique`;
}

export function futurePricingFootnote(countryCode: string | null = null): string | null {
  if (!PRICING_TEST_MODE) return null;
  const reg = FUTURE_REGISTRATION_FEES[countryCode === "US" ? "US" : "CA"] ??
    FUTURE_REGISTRATION_FEES.DEFAULT;
  const match = FUTURE_MATCHING_FEES[countryCode === "US" ? "US" : "CA"] ??
    FUTURE_MATCHING_FEES.DEFAULT;
  return `Tarifs prévus après la phase test : ${formatCurrency(reg.amount, reg.currency)} inscription, ${formatCurrency(match.amount, match.currency)} pour le premier match.`;
}

export const REGISTRATION_BENEFITS = PRICING_TEST_MODE
  ? ([
      {
        title: "Profil complet",
        description:
          "Photos, bio et préférences visibles par les membres actifs.",
      },
      {
        title: "Découverte illimitée",
        description:
          "Parcourez les profils et envoyez des likes sans limite pendant la phase test.",
      },
      {
        title: "Contact humain gratuit",
        description:
          "Échangez avec l'équipe Meet & Match à tout moment, sans frais.",
      },
    ] as const)
  : ([
      {
        title: "Profil complet",
        description:
          "Photos, bio et préférences visibles par les membres actifs.",
      },
      {
        title: "Découverte illimitée",
        description:
          "Parcourez les profils vérifiés et envoyez des likes sans limite.",
      },
      {
        title: "Contact humain gratuit",
        description:
          "Échangez avec l'équipe Meet & Match à tout moment, sans frais.",
      },
    ] as const);

export const REGISTRATION_FEATURES = PRICING_TEST_MODE
  ? ([
      "Création et modification de profil",
      "Upload de photos",
      "Consultation des profils actifs",
      "Envoi de likes illimités",
      "Activation gratuite pendant la phase test",
    ] as const)
  : ([
      "Création et modification de profil",
      "Upload de photos",
      "Consultation des profils actifs",
      "Envoi de likes illimités",
      "Notifications et tableau de bord",
    ] as const);

export const MATCHING_BENEFITS = PRICING_TEST_MODE
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
        title: "1er match payant",
        description:
          "Le premier frais de matching couvre l'ouverture de votre première mise en relation encadrée.",
      },
      {
        title: "3 matchs gratuits par mois",
        description:
          "Après ce premier paiement, bénéficiez de 3 mises en relation gratuites chaque mois (renouvelées automatiquement).",
      },
      {
        title: "Discussion encadrée",
        description: "Chat de groupe ouvert avec accompagnement de l'équipe.",
      },
    ] as const);

export const MATCHING_FEATURES = PRICING_TEST_MODE
  ? ([
      "Proposition de match par un administrateur",
      "Mise en relation gratuite pendant la phase test",
      "Discussion groupée encadrée",
      "Accompagnement Meet & Match",
    ] as const)
  : ([
      "Proposition de match par un administrateur",
      "1er match : frais de matching",
      "3 matchs gratuits par mois ensuite (renouvelés chaque mois)",
      "Ouverture de discussion groupée encadrée",
      "Accompagnement Meet & Match",
    ] as const);

/** Lignes du tableau comparatif (profil / paiements). */
export const PLAN_COMPARISON_ROWS = [
  {
    label: "Profil, photos et préférences",
    registration: true,
    matching: true,
  },
  {
    label: "Découverte et likes illimités",
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
  switch (currency) {
    case "USD":
      return "Tarif États-Unis";
    case "CAD":
    default:
      return "Tarif Canada (CAD)";
  }
}
