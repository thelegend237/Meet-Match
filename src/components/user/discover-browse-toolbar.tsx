"use client";

import { ChevronDown, Filter, LayoutGrid, Sparkles } from "lucide-react";
import { GENDER_FILTERS } from "@/components/user/discover-profile-grid-card";
import type { GenderPreference } from "@/lib/discover/profile-status";
import {
  LOCATION_FILTER_ALL,
  type DiscoverCityOption,
} from "@/lib/discover/location-filter";
import { cn } from "@/lib/utils";

export type DiscoverViewMode = "swipe" | "grid";

const selectTriggerClass =
  "h-9 min-w-[9.5rem] max-w-[12rem] rounded-full border-0 bg-muted px-3 py-1.5 text-xs font-medium text-foreground shadow-none transition-colors hover:bg-muted/80 sm:h-10 sm:min-w-[11rem] sm:max-w-[14rem] sm:px-4 sm:text-sm";

export function DiscoverBrowseToolbar({
  viewMode,
  onViewModeChange,
  browseGender,
  onBrowseGenderChange,
  cityOptions,
  browseCity,
  onBrowseCityChange,
  profileCount,
  totalCount,
}: {
  viewMode: DiscoverViewMode;
  onViewModeChange: (mode: DiscoverViewMode) => void;
  browseGender: GenderPreference;
  onBrowseGenderChange: (gender: GenderPreference) => void;
  cityOptions: DiscoverCityOption[];
  browseCity: string;
  onBrowseCityChange: (city: string) => void;
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

      {cityOptions.length > 0 || browseCity !== LOCATION_FILTER_ALL ? (
        <label className="relative inline-flex shrink-0">
          <span className="sr-only">Filtrer par ville</span>
          <select
            value={browseCity || LOCATION_FILTER_ALL}
            onChange={(event) => onBrowseCityChange(event.target.value)}
            className={cn(
              selectTriggerClass,
              "appearance-none pr-8 text-muted-foreground focus:outline-none focus:ring-2 focus:ring-secondary/30",
              browseCity !== LOCATION_FILTER_ALL && "text-foreground"
            )}
          >
            <option value={LOCATION_FILTER_ALL}>Toutes les villes</option>
            {cityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-muted-foreground">
            <ChevronDown className="h-3.5 w-3.5" />
          </span>
        </label>
      ) : null}

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
