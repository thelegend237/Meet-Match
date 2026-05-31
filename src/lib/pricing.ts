export type FeeAmount = {
  amount: number;
  currency: string;
};

const REGISTRATION_FEES: Record<string, FeeAmount> = {
  CA: { amount: 42, currency: "CAD" },
  US: { amount: 32, currency: "USD" },
  DEFAULT: { amount: 29, currency: "EUR" },
};

const MATCHING_FEES: Record<string, FeeAmount> = {
  CA: { amount: 72, currency: "CAD" },
  US: { amount: 55, currency: "USD" },
  DEFAULT: { amount: 49, currency: "EUR" },
};

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

export const REGISTRATION_BENEFITS = [
  {
    title: "Profil complet",
    description: "Photos, bio et préférences visibles par les membres actifs.",
  },
  {
    title: "Découverte illimitée",
    description: "Parcourez les profils vérifiés et envoyez des likes sans limite.",
  },
  {
    title: "Contact humain gratuit",
    description: "Échangez avec l'équipe Meet & Match à tout moment, sans frais.",
  },
] as const;

export const REGISTRATION_FEATURES = [
  "Création et modification de profil",
  "Upload de photos",
  "Consultation des profils actifs",
  "Envoi de likes illimités",
  "Notifications et tableau de bord",
] as const;

export const MATCHING_BENEFITS = [
  {
    title: "Sélection par un admin",
    description: "Mise en relation proposée uniquement après analyse de compatibilité.",
  },
  {
    title: "Discussion encadrée",
    description: "Chat de groupe ouvert avec accompagnement de l'équipe.",
  },
  {
    title: "Rencontre sérieuse",
    description: "Pas de swipe anonyme : chaque match est validé humainement.",
  },
] as const;

export const MATCHING_FEATURES = [
  "Proposition de match par un administrateur",
  "Analyse de compatibilité humaine",
  "Ouverture de discussion groupée encadrée",
  "Message d'introduction personnalisé",
  "Accompagnement Meet & Match",
] as const;

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
  switch (currency) {
    case "CAD":
      return "Tarif Canada";
    case "USD":
      return "Tarif États-Unis";
    default:
      return "Tarif Europe";
  }
}
