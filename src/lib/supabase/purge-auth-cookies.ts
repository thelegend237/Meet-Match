import type { NextRequest, NextResponse } from "next/server";

/** Supprime les cookies Supabase Auth (sb-*) côté middleware. */
export function purgeSupabaseAuthCookies(
  response: NextResponse,
  request: NextRequest
) {
  for (const { name } of request.cookies.getAll()) {
    if (name.startsWith("sb-")) {
      response.cookies.set(name, "", {
        maxAge: 0,
        path: "/",
      });
    }
  }
}
