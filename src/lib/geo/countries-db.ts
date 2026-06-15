import { createClient } from "@/lib/supabase/server";
import { getCountryName } from "@/lib/geo/countries-data";
import type { GeoCountry } from "@/lib/geo/types";

/**
 * Pays distincts présents dans geo_cities (après seed).
 * Retourne [] si la table est vide ou indisponible — l'API utilise alors GEO_COUNTRIES.
 */
export async function getCountriesFromGeoCities(): Promise<GeoCountry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("geo_cities")
    .select("country_code")
    .limit(5000);

  if (error || !data?.length) {
    if (error) {
      console.error("[geo/countries-db]", error.message);
    }
    return [];
  }

  const codes = [...new Set(data.map((row) => row.country_code as string))].sort();

  return codes.map((code) => ({
    code,
    name: getCountryName(code),
  }));
}
