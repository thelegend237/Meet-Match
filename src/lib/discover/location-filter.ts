import { getCountryName } from "@/lib/geo/countries-data";

export const LOCATION_FILTER_ALL = "all";

export type DiscoverCountryOption = {
  code: string;
  name: string;
};

export type DiscoverCityOption = {
  value: string;
  label: string;
  city: string;
  country_code: string;
};

type Locatable = {
  city: string | null;
  country_code: string | null;
};

export function encodeCityFilterValue(countryCode: string, city: string): string {
  return `${countryCode.toUpperCase()}::${city.trim()}`;
}

export function collectDiscoverCountryOptions(
  profiles: Locatable[]
): DiscoverCountryOption[] {
  const codes = new Set<string>();
  for (const profile of profiles) {
    const code = profile.country_code?.trim().toUpperCase();
    if (code) codes.add(code);
  }
  return [...codes]
    .sort((a, b) =>
      getCountryName(a).localeCompare(getCountryName(b), "fr", {
        sensitivity: "base",
      })
    )
    .map((code) => ({ code, name: getCountryName(code) }));
}

export function collectDiscoverCityOptions(
  profiles: Locatable[],
  countryFilter: string = LOCATION_FILTER_ALL
): DiscoverCityOption[] {
  const selectedCountry =
    countryFilter === LOCATION_FILTER_ALL
      ? null
      : countryFilter.trim().toUpperCase();
  const byValue = new Map<string, DiscoverCityOption>();

  for (const profile of profiles) {
    const city = profile.city?.trim();
    const countryCode = profile.country_code?.trim().toUpperCase();
    if (!city || !countryCode) continue;
    if (selectedCountry && countryCode !== selectedCountry) continue;

    const value = encodeCityFilterValue(countryCode, city);
    if (byValue.has(value)) continue;

    byValue.set(value, {
      value,
      label: selectedCountry ? city : `${city} (${countryCode})`,
      city,
      country_code: countryCode,
    });
  }

  return [...byValue.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "fr", { sensitivity: "base" })
  );
}

export function filterProfilesByLocation<T extends Locatable>(
  profiles: T[],
  countryFilter: string,
  cityFilter: string
): T[] {
  const country =
    countryFilter === LOCATION_FILTER_ALL
      ? null
      : countryFilter.trim().toUpperCase();
  const cityValue =
    cityFilter === LOCATION_FILTER_ALL ? null : cityFilter.trim();

  if (!country && !cityValue) return profiles;

  return profiles.filter((profile) => {
    const code = profile.country_code?.trim().toUpperCase() ?? "";
    const city = profile.city?.trim() ?? "";
    if (country && code !== country) return false;
    if (cityValue && encodeCityFilterValue(code, city) !== cityValue) {
      return false;
    }
    return true;
  });
}
