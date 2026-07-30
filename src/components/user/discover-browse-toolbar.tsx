"use client";

import { Filter, LayoutGrid, Sparkles } from "lucide-react";
import { GENDER_FILTERS } from "@/components/user/discover-profile-grid-card";
import type { GenderPreference } from "@/lib/discover/profile-status";
import { cn } from "@/lib/utils";

export type DiscoverViewMode = "swipe" | "grid";

export function DiscoverBrowseToolbar({
  viewMode,
  onViewModeChange,
  browseGender,
  onBrowseGenderChange,
  profileCount,
  totalCount,
}: {
  viewMode: DiscoverViewMode;
  onViewModeChange: (mode: DiscoverViewMode) => void;
  browseGender: GenderPreference;
  onBrowseGenderChange: (gender: GenderPreference) => void;
  profileCount: number;
  totalCount?: number;
}) {
  return (
    <div className="mm-card flex flex-wrap items-center gap-2 p-2.5 sm:gap-3 sm:p-4">
      <div className="flex w-full items-center gap-1 rounded-full bg-muted/70 p-1 sm:w-auto sm:gap-2 sm:bg-transparent sm:p-0">
        <button
          type="button"
          onClick={() => onViewModeChange("swipe")}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:flex-none sm:gap-2 sm:px-4 sm:text-sm",
            viewMode === "swipe"
              ? "bg-secondary text-white shadow-sm"
              : "bg-transparent text-muted-foreground hover:bg-muted/80 sm:bg-muted"
          )}
        >
          <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Carte
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("grid")}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors sm:flex-none sm:gap-2 sm:px-4 sm:text-sm",
            viewMode === "grid"
              ? "bg-secondary text-white shadow-sm"
              : "bg-transparent text-muted-foreground hover:bg-muted/80 sm:bg-muted"
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Grille
        </button>
      </div>

      <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
        Afficher :
      </span>
      {GENDER_FILTERS.map((filter) => (
        <button
          key={filter.value}
          type="button"
          onClick={() => onBrowseGenderChange(filter.value)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:py-2 sm:text-sm",
            browseGender === filter.value
              ? "bg-secondary text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {filter.label}
        </button>
      ))}
      <div className="ml-auto flex w-full sm:w-auto">
        <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1.5 text-xs font-medium text-secondary sm:w-auto sm:gap-2 sm:px-4 sm:py-2 sm:text-sm">
          <Filter className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
          {totalCount != null
            ? `${profileCount} à swiper sur ${totalCount}`
            : `${profileCount} profil${profileCount !== 1 ? "s" : ""}`}
        </span>
      </div>
    </div>
  );
}
