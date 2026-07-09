/** Fil de discussion ouvert (pas la liste /messages). */
export function isUserMessageThread(pathname: string): boolean {
  return /^\/messages\/[^/]+/.test(pathname);
}

/** Section messages (liste ou fil). */
export function isUserMessagesSection(pathname: string): boolean {
  return pathname === "/messages" || isUserMessageThread(pathname);
}

/** Fil admin ouvert (pas la liste des discussions). */
export function isAdminConversationThread(pathname: string): boolean {
  return /^\/admin\/conversations\/[^/]+/.test(pathname);
}
