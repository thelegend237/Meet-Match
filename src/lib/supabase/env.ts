const LOCAL_SUPABASE_HINT =
  "Si vous utilisez Supabase en local, lancez d'abord : supabase start";

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    throw new Error(
      "Configuration Supabase manquante. Ajoutez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans .env.local, puis redémarrez npm run dev."
    );
  }

  if (
    (url.includes("127.0.0.1") || url.includes("localhost")) &&
    !url.includes(".supabase.co")
  ) {
    throw new Error(
      `Supabase local configuré (${url}) mais le serveur local ne répond pas. ${LOCAL_SUPABASE_HINT}`
    );
  }

  return { url, anonKey };
}

export function getSupabaseProjectRef(url: string): string | null {
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

export function hasSupabaseAuthCookie(
  cookies: { name: string; value: string }[]
): boolean {
  return cookies.some(
    (cookie) =>
      cookie.name.startsWith("sb-") &&
      cookie.name.includes("auth-token") &&
      cookie.value.length > 0
  );
}
