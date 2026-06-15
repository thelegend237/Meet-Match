import { NextResponse } from "next/server";
import { GEO_COUNTRIES, getCountryName } from "@/lib/geo/countries-data";
import { getCountriesFromGeoCities } from "@/lib/geo/countries-db";

export async function GET() {
  const countries = await getCountriesFromGeoCities();

  return NextResponse.json(
    {
      countries: countries.length
        ? countries
        : GEO_COUNTRIES.map((country) => ({
            code: country.code,
            name: getCountryName(country.code),
          })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
