import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { GeoCityResult } from "@/lib/geo/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const countryCode = searchParams.get("country")?.trim().toUpperCase();
  const query = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") ?? 20), 1),
    50
  );

  if (!countryCode || countryCode.length !== 2) {
    return NextResponse.json(
      { error: "Paramètre country requis (code ISO 2 lettres)" },
      { status: 400 }
    );
  }

  if (query.length > 0 && query.length < 2) {
    return NextResponse.json({ cities: [] as GeoCityResult[] });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_geo_cities", {
    p_country_code: countryCode,
    p_query: query,
    p_limit: limit,
  });

  if (error) {
    console.error("[geo/cities]", error.message);
    return NextResponse.json(
      { error: "Impossible de charger les villes" },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { cities: (data ?? []) as GeoCityResult[] },
    {
      headers: {
        "Cache-Control": query ? "private, no-cache" : "public, s-maxage=3600",
      },
    }
  );
}
