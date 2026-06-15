import type { Provider } from "@supabase/supabase-js";
import { USER_HOME } from "@/lib/auth/routes";

export const OAUTH_PROVIDERS = [
  { id: "google" as const, label: "Google" },
  { id: "facebook" as const, label: "Facebook" },
] as const;

export type AppOAuthProvider = (typeof OAUTH_PROVIDERS)[number]["id"];

export function toSupabaseProvider(id: AppOAuthProvider): Provider {
  return id;
}

export function buildOAuthCallbackUrl(nextPath?: string | null): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const next =
    nextPath &&
    nextPath.startsWith("/") &&
    !nextPath.startsWith("//")
      ? nextPath
      : USER_HOME;

  const params = new URLSearchParams({ next });
  return `${origin}/auth/callback?${params.toString()}`;
}

export function oauthDisplayName(metadata: Record<string, unknown>): string | null {
  const candidates = [
    metadata.display_name,
    metadata.full_name,
    metadata.name,
    metadata.user_name,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}
