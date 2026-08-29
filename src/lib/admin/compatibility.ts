import type { AdminCompareProfile, RelationshipType } from "@/lib/types/database";
import { getAge } from "@/lib/utils";

export interface CompatibilityPoint {
  label: string;
  status: "match" | "partial" | "mismatch" | "info";
  /** Poids relatif (genre/âge = 3, relation/portée = 2, reste = 1). */
  weight?: number;
}

const GENDER_LABEL: Record<string, string> = {
  male: "un homme",
  female: "une femme",
  other: "autre genre",
  prefer_not_say: "genre non précisé",
};

const RELATIONSHIP_GROUPS: Record<RelationshipType, "commitment" | "social" | "other"> = {
  serious: "commitment",
  marriage: "commitment",
  friendship: "social",
  other: "other",
};

function genderMatch(
  viewer: AdminCompareProfile,
  candidate: AdminCompareProfile
): CompatibilityPoint {
  const pref = viewer.preferred_gender;
  const gender = candidate.gender;
  const weight = 3;

  if (!pref) {
    return {
      label: `${viewer.display_name} : préférence de genre non renseignée`,
      status: "mismatch",
      weight,
    };
  }

  if (!gender) {
    return {
      label: `${candidate.display_name} : genre non renseigné`,
      status: "mismatch",
      weight,
    };
  }

  if (pref === "both") {
    return {
      label: `${viewer.display_name} ouvert·e aux hommes et aux femmes`,
      status: "match",
      weight,
    };
  }

  if (gender === "prefer_not_say" || gender === "other") {
    return {
      label: `${candidate.display_name} (${GENDER_LABEL[gender]}) — préférence ${viewer.display_name} : ${pref === "male" ? "hommes" : "femmes"}`,
      status: "partial",
      weight,
    };
  }

  if (pref === gender) {
    return {
      label: `${viewer.display_name} recherche ${GENDER_LABEL[pref]} — compatible`,
      status: "match",
      weight,
    };
  }

  return {
    label: `${viewer.display_name} préfère ${pref === "male" ? "les hommes" : "les femmes"}`,
    status: "mismatch",
    weight,
  };
}

function ageMatch(
  viewer: AdminCompareProfile,
  candidate: AdminCompareProfile
): CompatibilityPoint {
  const weight = 3;
  const age = getAge(candidate.date_of_birth);

  if (age === null) {
    return {
      label: `Âge de ${candidate.display_name} non renseigné`,
      status: "mismatch",
      weight,
    };
  }

  const min = viewer.preferred_age_min;
  const max = viewer.preferred_age_max;

  if (min == null || max == null) {
    return {
      label: `${viewer.display_name} : tranche d'âge non renseignée`,
      status: "mismatch",
      weight,
    };
  }

  const inRange = age >= min && age <= max;

  if (inRange) {
    return {
      label: `${candidate.display_name} (${age} ans) dans la tranche ${min}–${max} ans de ${viewer.display_name}`,
      status: "match",
      weight,
    };
  }

  const nearRange =
    (age >= min - 3 && age < min) || (age <= max + 3 && age > max);

  if (nearRange) {
    return {
      label: `${candidate.display_name} (${age} ans) proche de la tranche ${min}–${max} ans`,
      status: "partial",
      weight,
    };
  }

  return {
    label: `${candidate.display_name} (${age} ans) hors tranche ${min}–${max} ans`,
    status: "mismatch",
    weight,
  };
}

function relationshipMatch(
  a: AdminCompareProfile,
  b: AdminCompareProfile
): CompatibilityPoint {
  const weight = 2;

  if (!a.relationship_type || !b.relationship_type) {
    return {
      label: "Type de relation manquant sur l'un des profils",
      status: "mismatch",
      weight,
    };
  }

  if (a.relationship_type === b.relationship_type) {
    return { label: "Même type de relation recherché", status: "match", weight };
  }

  const groupA = RELATIONSHIP_GROUPS[a.relationship_type];
  const groupB = RELATIONSHIP_GROUPS[b.relationship_type];

  if (groupA === groupB) {
    return {
      label: "Intentions proches (même famille de relation)",
      status: "partial",
      weight,
    };
  }

  return { label: "Types de relation différents", status: "mismatch", weight };
}

function sameCity(a: AdminCompareProfile, b: AdminCompareProfile): boolean {
  return (
    !!a.city &&
    !!b.city &&
    a.city.trim().toLowerCase() === b.city.trim().toLowerCase()
  );
}

function sameCountry(a: AdminCompareProfile, b: AdminCompareProfile): boolean {
  return !!a.country_code && !!b.country_code && a.country_code === b.country_code;
}

function scopeFit(
  person: AdminCompareProfile,
  other: AdminCompareProfile
): CompatibilityPoint {
  const weight = 2;
  const scope = person.preferred_relation_scope;

  if (!scope) {
    return {
      label: `${person.display_name} : portée de recherche non renseignée`,
      status: "mismatch",
      weight,
    };
  }

  if (scope === "international") {
    return {
      label: `${person.display_name} ouvert·e à l'international`,
      status: "match",
      weight,
    };
  }

  if (scope === "national") {
    if (sameCountry(person, other)) {
      return {
        label: `${person.display_name} cherche au niveau national — même pays`,
        status: "match",
        weight,
      };
    }
    return {
      label: `${person.display_name} cherche au niveau national — pays différents`,
      status: "mismatch",
      weight,
    };
  }

  // local
  if (sameCity(person, other)) {
    return {
      label: `${person.display_name} cherche en local — même ville (${person.city})`,
      status: "match",
      weight,
    };
  }
  if (sameCountry(person, other)) {
    return {
      label: `${person.display_name} cherche en local — villes différentes`,
      status: "partial",
      weight,
    };
  }
  return {
    label: `${person.display_name} cherche en local — géographie éloignée`,
    status: "mismatch",
    weight,
  };
}

function locationMatch(
  a: AdminCompareProfile,
  b: AdminCompareProfile
): CompatibilityPoint {
  const weight = 1.5;

  if (sameCity(a, b)) {
    return { label: `Même ville : ${a.city}`, status: "match", weight };
  }

  const aPrefersB =
    (a.preferred_city &&
      b.city &&
      a.preferred_city.trim().toLowerCase() === b.city.trim().toLowerCase()) ||
    (a.preferred_country_code &&
      b.country_code &&
      a.preferred_country_code === b.country_code);

  const bPrefersA =
    (b.preferred_city &&
      a.city &&
      b.preferred_city.trim().toLowerCase() === a.city.trim().toLowerCase()) ||
    (b.preferred_country_code &&
      a.country_code &&
      b.preferred_country_code === a.country_code);

  if (aPrefersB && bPrefersA) {
    return {
      label: "Zones recherchées alignées avec la localisation de l'autre",
      status: "match",
      weight,
    };
  }
  if (aPrefersB || bPrefersA) {
    return {
      label: "Une zone recherchée correspond à la localisation de l'autre",
      status: "partial",
      weight,
    };
  }

  if (sameCountry(a, b)) {
    return { label: `Même pays (${a.country_code})`, status: "partial", weight };
  }

  return {
    label: `Localisation : ${a.city ?? "?"} / ${b.city ?? "?"}`,
    status: "info",
    weight,
  };
}

function profileDepth(
  a: AdminCompareProfile,
  b: AdminCompareProfile
): CompatibilityPoint {
  const weight = 1;
  const aBio = (a.bio?.trim().length ?? 0) >= 20;
  const bBio = (b.bio?.trim().length ?? 0) >= 20;

  if (aBio && bBio) {
    return {
      label: "Présentations suffisamment détaillées des deux côtés",
      status: "match",
      weight,
    };
  }
  if (aBio || bBio) {
    return {
      label: "Présentation incomplète sur l'un des profils",
      status: "partial",
      weight,
    };
  }
  return {
    label: "Présentations trop courtes pour analyser la compatibilité",
    status: "mismatch",
    weight,
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
    scopeFit(a, b),
    scopeFit(b, a),
    locationMatch(a, b),
    profileDepth(a, b),
  ];
}

export function compatibilityScore(points: CompatibilityPoint[]): number {
  let earned = 0;
  let max = 0;

  for (const p of points) {
    const w = p.weight ?? 1;
    max += w * 2;
    if (p.status === "match") earned += w * 2;
    else if (p.status === "partial") earned += w * 1;
  }

  if (max === 0) return 0;
  return Math.round((earned / max) * 100);
}
