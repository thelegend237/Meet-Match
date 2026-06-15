/** Normalise un nom de ville (aligné sur public.normalize_city_key en SQL). */
export function normalizeCityKey(city: string): string {
  return city
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/\s+/g, " ");
}

export type GeoCountry = {
  code: string;
  name: string;
};

export type GeoCityResult = {
  id: number;
  name: string;
  country_code: string;
  latitude: number;
  longitude: number;
  population: number;
};
