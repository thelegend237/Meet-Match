/** Langues parlées — codes ISO courts stockés en base (`profiles.languages`). */

export const SPOKEN_LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Português" },
  { code: "ar", label: "Arabe" },
  { code: "de", label: "Allemand" },
  { code: "it", label: "Italien" },
] as const;

export type SpokenLanguageCode = (typeof SPOKEN_LANGUAGES)[number]["code"];

export const SPOKEN_LANGUAGE_CODES = SPOKEN_LANGUAGES.map(
  (l) => l.code
) as unknown as readonly [SpokenLanguageCode, ...SpokenLanguageCode[]];

const LABEL_BY_CODE = Object.fromEntries(
  SPOKEN_LANGUAGES.map((l) => [l.code, l.label])
) as Record<string, string>;

export function spokenLanguageLabel(code: string): string {
  return LABEL_BY_CODE[code] ?? code.toUpperCase();
}

export function getProfileLanguages(profile: {
  languages?: string[] | null;
  language?: string | null;
}): string[] {
  if (profile.languages?.length) return profile.languages;
  if (profile.language?.trim()) return [profile.language.trim()];
  return [];
}

export function formatProfileLanguages(
  profile: {
    languages?: string[] | null;
    language?: string | null;
  },
  separator = " · "
): string {
  const codes = getProfileLanguages(profile);
  if (!codes.length) return "";
  return codes.map(spokenLanguageLabel).join(separator);
}

export function toggleSpokenLanguage(
  selected: string[],
  code: string
): string[] {
  if (selected.includes(code)) {
    return selected.filter((c) => c !== code);
  }
  return [...selected, code];
}