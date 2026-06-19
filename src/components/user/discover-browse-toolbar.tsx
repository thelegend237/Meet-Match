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
}: {
  viewMode: DiscoverViewMode;
  onViewModeChange: (mode: DiscoverViewMode) => void;
  browseGender: GenderPreference;
  onBrowseGenderChange: (gender: GenderPreference) => void;
  profileCount: number;
}) {
  return (
    <div className="mm-card flex flex-wrap items-center gap-3 p-4">
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
        <button
          type="button"
          onClick={() => onViewModeChange("swipe")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            viewMode === "swipe"
              ? "bg-secondary text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <Sparkles className="h-4 w-4" />
          Carte
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange("grid")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            viewMode === "grid"
              ? "bg-secondary text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          <LayoutGrid className="h-4 w-4" />
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
            "rounded-full px-4 py-2 text-sm font-medium transition-colors",
            browseGender === filter.value
              ? "bg-secondary text-white shadow-sm"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {filter.label}
        </button>
      ))}
      <div className="ml-auto flex w-full sm:w-auto">
        <span className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-secondary/10 px-4 py-2 text-sm font-medium text-secondary sm:w-auto">
          <Filter className="h-4 w-4 shrink-0" />
          {profileCount} profil{profileCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
