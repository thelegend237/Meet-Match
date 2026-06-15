"use client";

import { Globe, MapPin } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { IconField } from "@/components/public/inscription/inscription-ui";
import { CountrySelect } from "@/components/ui/country-select";
import { GEO_COUNTRIES } from "@/lib/geo/countries-data";
import type { GeoCityResult } from "@/lib/geo/types";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-12 w-full rounded-xl border border-border/60 bg-[#faf8fc] pl-11 pr-4 text-[15px] text-primary outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-secondary/40 focus:bg-white focus:ring-2 focus:ring-secondary/15";

type LocationPickerProps = {
  countryCode: string;
  city: string;
  onCountryChange: (code: string) => void;
  onCityChange: (city: string) => void;
  countryLabel?: string;
  cityLabel?: string;
  cityPlaceholder?: string;
  className?: string;
};

export function LocationPicker({
  countryCode,
  city,
  onCountryChange,
  onCityChange,
  countryLabel = "Pays",
  cityLabel = "Ville",
  cityPlaceholder = "Rechercher une ville…",
  className,
}: LocationPickerProps) {
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(city);
  const [suggestions, setSuggestions] = useState<GeoCityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  useEffect(() => {
    setQuery(city);
  }, [city]);

  const fetchCities = useCallback(
    async (q: string) => {
      if (!countryCode || countryCode.length !== 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({
          country: countryCode,
          q,
          limit: "20",
        });
        const res = await fetch(`/api/geo/cities?${params}`);
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const json = (await res.json()) as { cities: GeoCityResult[] };
        setSuggestions(json.cities ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [countryCode]
  );

  useEffect(() => {
    if (!open || !countryCode) return;

    const q = query.trim();
    if (q.length < 2) {
      void fetchCities("");
      return;
    }

    const timer = window.setTimeout(() => {
      void fetchCities(q);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query, countryCode, open, fetchCities]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function selectCity(item: GeoCityResult) {
    setQuery(item.name);
    onCityChange(item.name);
    setOpen(false);
    setSuggestions([]);
  }

  function handleCountryChange(code: string) {
    onCountryChange(code);
    setQuery("");
    onCityChange("");
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className={cn("space-y-4", className)}>
      <IconField label={countryLabel} icon={Globe}>
        <CountrySelect
          value={countryCode}
          onChange={handleCountryChange}
          options={GEO_COUNTRIES}
          showAllOption={false}
          placeholder="Sélectionnez votre pays"
          triggerClassName={cn(fieldClass, "pr-4")}
        />
      </IconField>

      <div ref={wrapperRef} className="relative">
        <IconField label={cityLabel} icon={MapPin}>
          <input
            type="text"
            value={query}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            disabled={!countryCode}
            placeholder={
              countryCode ? cityPlaceholder : "Sélectionnez d'abord un pays"
            }
            className={fieldClass}
            onFocus={() => {
              if (countryCode) setOpen(true);
            }}
            onChange={(e) => {
              setQuery(e.target.value);
              onCityChange(e.target.value);
              setOpen(true);
              setHighlight(0);
            }}
            onKeyDown={(e) => {
              if (!open || suggestions.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const item = suggestions[highlight];
                if (item) selectCity(item);
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
        </IconField>

        {open && countryCode && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border/60 bg-white py-1 shadow-[0_8px_30px_rgba(46,26,71,0.12)] ring-1 ring-black/5"
          >
            {loading && suggestions.length === 0 && (
              <li className="px-4 py-2.5 text-sm text-muted-foreground">
                Recherche…
              </li>
            )}
            {!loading && suggestions.length === 0 && query.trim().length >= 2 && (
              <li className="px-4 py-2.5 text-sm text-muted-foreground">
                Aucune ville trouvée — vérifiez l&apos;orthographe
              </li>
            )}
            {!loading &&
              query.trim().length < 2 &&
              suggestions.length === 0 && (
                <li className="px-4 py-2.5 text-sm text-muted-foreground">
                  Saisissez au moins 2 caractères
                </li>
              )}
            {suggestions.map((item, idx) => (
              <li key={item.id} role="option" aria-selected={idx === highlight}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-[#faf8fc]",
                    idx === highlight && "bg-secondary/5 text-secondary"
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectCity(item)}
                >
                  <span className="font-medium text-primary">{item.name}</span>
                  {item.population > 0 && (
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {item.population.toLocaleString("fr-FR")} hab.
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
