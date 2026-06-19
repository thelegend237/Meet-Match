import type { OnboardingStepId } from "@/lib/onboarding/steps";
import { PROFILE_PHOTO_ANTI_FAKE_ONBOARDING } from "@/lib/photos/copy";

export type InscriptionPhase = 1 | 2 | 3 | 4 | 5;

export const INSCRIPTION_PHASE_COUNT = 5;

const PHASE_1: OnboardingStepId[] = ["account"];
const PHASE_2: OnboardingStepId[] = ["gender", "birthdate", "language"];
const PHASE_3: OnboardingStepId[] = ["bio", "expectations", "relationship"];
const PHASE_4: OnboardingStepId[] = ["seek_gender", "age_range", "scope"];
const PHASE_5: OnboardingStepId[] = ["photo", "done"];

export const INSCRIPTION_PHASES: {
  phase: InscriptionPhase;
  title: string;
  steps: OnboardingStepId[];
}[] = [
  { phase: 1, title: "Créer votre compte", steps: PHASE_1 },
  { phase: 2, title: "Votre identité", steps: PHASE_2 },
  { phase: 3, title: "Votre profil", steps: PHASE_3 },
  { phase: 4, title: "Vos préférences", steps: PHASE_4 },
  { phase: 5, title: "Finalisation", steps: PHASE_5 },
];

export function getInscriptionPhase(step: OnboardingStepId): InscriptionPhase {
  if (PHASE_1.includes(step)) return 1;
  if (PHASE_2.includes(step)) return 2;
  if (PHASE_3.includes(step)) return 3;
  if (PHASE_4.includes(step)) return 4;
  return 5;
}

export function getPhaseTitle(step: OnboardingStepId): string {
  return (
    INSCRIPTION_PHASES.find((p) => p.steps.includes(step))?.title ??
    "Inscription"
  );
}

export function getPublicStepTitle(step: OnboardingStepId): string {
  const titles: Partial<Record<OnboardingStepId, string>> = {
    account: "Créer votre compte",
    gender: "Vous êtes ?",
    birthdate: "Date de naissance",
    language: "Langues parlées",
    bio: "Parlez-nous de vous",
    expectations: "Vos attentes",
    relationship: "Type de relation",
    seek_gender: "Qui rencontrer ?",
    age_range: "Tranche d'âge recherchée",
    scope: "Portée de recherche",
    photo: "Photo de profil",
    done: "C'est presque fini !",
  };
  return titles[step] ?? getPhaseTitle(step);
}

export function getPublicStepSubtitle(step: OnboardingStepId): string {
  const subtitles: Partial<Record<OnboardingStepId, string>> = {
    account:
      "Vos identifiants et votre localisation pour démarrer en toute confiance.",
    gender: "Cette information aide à personnaliser vos suggestions.",
    birthdate: "Votre âge sera visible sur votre profil public.",
    language: "Langues utilisées pour les échanges avec l'équipe et les matchs.",
    bio: "Présentez-vous en quelques lignes — minimum 20 caractères.",
    expectations:
      "Décrivez ce que vous recherchez : nos administrateurs s'en servent pour vous accompagner.",
    relationship: "Quelle forme de relation souhaitez-vous construire ?",
    seek_gender: "Indiquez le genre des profils que vous souhaitez découvrir.",
    age_range: "Affinez les profils proposés selon la tranche d'âge idéale.",
    scope: "Proximité géographique souhaitée pour vos rencontres.",
    photo: PROFILE_PHOTO_ANTI_FAKE_ONBOARDING,
    done: "Votre profil est prêt — vous pourrez le compléter à tout moment.",
  };
  return subtitles[step] ?? "";
}

export function isPublicStepOptional(step: OnboardingStepId): boolean {
  return step !== "account" && step !== "done" && step !== "photo";
}

export function phaseProgressPercent(step: OnboardingStepId): number {
  const phase = getInscriptionPhase(step);
  const meta = INSCRIPTION_PHASES.find((p) => p.phase === phase);
  if (!meta) return 20;
  const idx = meta.steps.indexOf(step);
  const sub = idx >= 0 ? (idx + 1) / meta.steps.length : 1;
  return Math.round(((phase - 1 + sub) / INSCRIPTION_PHASE_COUNT) * 100);
}
