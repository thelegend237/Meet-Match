import type { AdminCompareProfile } from "@/lib/types/database";
import { getAge } from "@/lib/utils";

export interface CompatibilityPoint {
  label: string;
  status: "match" | "partial" | "mismatch" | "info";
}

function genderMatch(
  viewer: AdminCompareProfile,
  candidate: AdminCompareProfile
): CompatibilityPoint {
  const pref = viewer.preferred_gender ?? "both";
  const gender = candidate.gender;

  if (!gender) {
    return { label: `${viewer.display_name} → genre de ${candidate.display_name}`, status: "info" };
  }

  if (pref === "both") {
    return {
      label: `${viewer.display_name} recherche hommes et femmes`,
      status: "match",
    };
  }

  if (pref === gender) {
    return {
      label: `${viewer.display_name} recherche ${pref === "male" ? "un homme" : "une femme"} ✓`,
      status: "match",
    };
  }

  return {
    label: `${viewer.display_name} préfère ${pref === "male" ? "les hommes" : "les femmes"}`,
    status: "mismatch",
  };
}

function ageMatch(
  viewer: AdminCompareProfile,
  candidate: AdminCompareProfile
): CompatibilityPoint {
  const age = getAge(candidate.date_of_birth);
  if (age === null) {
    return { label: `Âge de ${candidate.display_name} non renseigné`, status: "info" };
  }

  const min = viewer.preferred_age_min;
  const max = viewer.preferred_age_max;

  if (min == null && max == null) {
    return { label: `${viewer.display_name} : pas de préférence d'âge`, status: "info" };
  }

  const inRange =
    (min == null || age >= min) && (max == null || age <= max);

  if (inRange) {
    return {
      label: `${candidate.display_name} (${age} ans) dans la tranche de ${viewer.display_name}`,
      status: "match",
    };
  }

  return {
    label: `${candidate.display_name} (${age} ans) hors tranche ${min ?? "?"}–${max ?? "?"} de ${viewer.display_name}`,
    status: "mismatch",
  };
}

function relationshipMatch(a: AdminCompareProfile, b: AdminCompareProfile): CompatibilityPoint {
  if (!a.relationship_type || !b.relationship_type) {
    return { label: "Type de relation non renseigné pour l'un des profils", status: "info" };
  }
  if (a.relationship_type === b.relationship_type) {
    return { label: "Même type de relation recherché", status: "match" };
  }
  return { label: "Types de relation différents", status: "partial" };
}

function locationMatch(a: AdminCompareProfile, b: AdminCompareProfile): CompatibilityPoint {
  if (a.city && b.city && a.city.toLowerCase() === b.city.toLowerCase()) {
    return { label: `Même ville : ${a.city}`, status: "match" };
  }
  if (a.country_code && b.country_code && a.country_code === b.country_code) {
    return { label: `Même pays (${a.country_code})`, status: "partial" };
  }
  return {
    label: `Localisation : ${a.city ?? "?"} (${a.country_code ?? "?"}) / ${b.city ?? "?"} (${b.country_code ?? "?"})`,
    status: "info",
  };
}

export function computePairCompatibility(
  a: AdminCompareProfile,
  b: AdminCompareProfile
): CompatibilityPoint[] {
  return [
    genderMatch(a, b),
    genderMatch(b, a),
    ageMatch(a, b),
    ageMatch(b, a),
    relationshipMatch(a, b),
    locationMatch(a, b),
  ];
}

export function compatibilityScore(points: CompatibilityPoint[]): number {
  let score = 0;
  for (const p of points) {
    if (p.status === "match") score += 2;
    else if (p.status === "partial") score += 1;
  }
  return Math.round((score / (points.length * 2)) * 100);
}
