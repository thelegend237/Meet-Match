export const MEMBER_MIN_AGE = 18;

export const MEMBER_MIN_AGE_ERROR = `Vous devez avoir au moins ${MEMBER_MIN_AGE} ans pour rejoindre Meet & Match`;

/** Dernière date de naissance autorisée pour avoir au moins MEMBER_MIN_AGE ans aujourd'hui. */
export function getMaxBirthDateForMinAge(minAge = MEMBER_MIN_AGE): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setFullYear(date.getFullYear() - minAge);
  return date.toISOString().slice(0, 10);
}

export function parseBirthDate(dateOfBirth: string): Date | null {
  const trimmed = dateOfBirth.trim();
  if (!trimmed) return null;
  const birth = new Date(`${trimmed}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  return birth;
}

export function meetsMinimumMemberAge(
  dateOfBirth: string | null | undefined,
  minAge = MEMBER_MIN_AGE
): boolean {
  const birth = dateOfBirth ? parseBirthDate(dateOfBirth) : null;
  if (!birth) return false;

  const latestAllowed = parseBirthDate(getMaxBirthDateForMinAge(minAge));
  if (!latestAllowed) return false;

  return birth <= latestAllowed;
}

/** Valide une date de naissance optionnelle : vide OK, sinon 18+ requis. */
export function isOptionalMemberBirthDateValid(
  dateOfBirth: string | null | undefined
): boolean {
  if (!dateOfBirth?.trim()) return true;
  return meetsMinimumMemberAge(dateOfBirth);
}
