export type OnboardingStepId =
  | "welcome"
  | "account"
  | "location"
  | "gender"
  | "birthdate"
  | "language"
  | "bio"
  | "expectations"
  | "relationship"
  | "seek_gender"
  | "age_range"
  | "scope"
  | "photo"
  | "done";

export type OnboardingStepMeta = {
  id: OnboardingStepId;
  optional: boolean;
};

/** Étapes après création du compte (profil). */
export const PROFILE_STEPS: OnboardingStepMeta[] = [
  { id: "gender", optional: false },
  { id: "birthdate", optional: false },
  { id: "language", optional: true },
  { id: "bio", optional: false },
  { id: "expectations", optional: true },
  { id: "relationship", optional: false },
  { id: "seek_gender", optional: false },
  { id: "age_range", optional: false },
  { id: "scope", optional: false },
  { id: "photo", optional: false },
  { id: "done", optional: false },
];

/** Parcours complet visiteur (inscription). */
export const PUBLIC_STEPS: OnboardingStepMeta[] = [
  { id: "account", optional: false },
  ...PROFILE_STEPS,
];

export function getStepsForMode(mode: "public" | "continue"): OnboardingStepMeta[] {
  return mode === "public" ? PUBLIC_STEPS : PROFILE_STEPS;
}

export function stepIndex(
  steps: OnboardingStepMeta[],
  id: OnboardingStepId
): number {
  return steps.findIndex((s) => s.id === id);
}

export function parseStepParam(
  value: string | null,
  steps: OnboardingStepMeta[]
): OnboardingStepId {
  const ids = steps.map((s) => s.id);
  if (value && ids.includes(value as OnboardingStepId)) {
    return value as OnboardingStepId;
  }
  return steps[0]?.id ?? "welcome";
}

export function nextStepId(
  steps: OnboardingStepMeta[],
  current: OnboardingStepId
): OnboardingStepId | null {
  const i = stepIndex(steps, current);
  if (i < 0 || i >= steps.length - 1) return null;
  return steps[i + 1].id;
}

export function prevStepId(
  steps: OnboardingStepMeta[],
  current: OnboardingStepId
): OnboardingStepId | null {
  const i = stepIndex(steps, current);
  if (i <= 0) return null;
  return steps[i - 1].id;
}

export function progressPercent(
  steps: OnboardingStepMeta[],
  current: OnboardingStepId
): number {
  const i = stepIndex(steps, current);
  if (i < 0) return 0;
  return Math.round(((i + 1) / steps.length) * 100);
}
