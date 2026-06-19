export function isStaleAuthError(error: {
  message?: string;
  code?: string;
}): boolean {
  if (error.code === "refresh_token_not_found") return true;
  if (error.code === "session_not_found") return true;

  const lower = (error.message ?? "").toLowerCase();
  return (
    lower.includes("refresh") ||
    lower.includes("jwt") ||
    lower.includes("session") ||
    lower.includes("invalid")
  );
}
