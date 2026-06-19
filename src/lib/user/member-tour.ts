export const MEMBER_TOUR_STORAGE_KEY = "mm_welcome_tour_v1";

export function isMemberTourCompleted(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(MEMBER_TOUR_STORAGE_KEY) === "done";
}

export function markMemberTourCompleted(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MEMBER_TOUR_STORAGE_KEY, "done");
}

export function resetMemberTour(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MEMBER_TOUR_STORAGE_KEY);
}
