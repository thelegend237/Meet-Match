"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronRight,
  Camera,
  User,
  MapPin,
  Heart,
  Target,
  Phone,
  Mail,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { updateProfile } from "@/lib/actions/profile";
import { COUNTRIES } from "@/lib/validations/auth";
import {
  GENDER_LABELS,
  GENDER_PREFERENCE_LABELS,
  RELATIONSHIP_LABELS,
  SCOPE_LABELS,
  type ProfileFormData,
} from "@/lib/validations/profile";
import type { Profile } from "@/lib/types/database";

type FieldKey = keyof ProfileFormData;

interface EditRow {
  id: FieldKey | "email";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  getValue: (p: Profile) => string;
  section?: string;
}

function profileToForm(p: Profile): ProfileFormData {
  return {
    display_name: p.display_name,
    phone: p.phone ?? "",
    date_of_birth: p.date_of_birth ?? "",
    gender: p.gender ?? undefined,
    country_code: p.country_code ?? "FR",
    city: p.city ?? "",
    language: p.language ?? "fr",
    bio: p.bio ?? "",
    expectations: p.expectations ?? "",
    relationship_type: p.relationship_type ?? undefined,
    preferred_age_min: p.preferred_age_min ?? undefined,
    preferred_age_max: p.preferred_age_max ?? undefined,
    preferred_country_code: p.preferred_country_code ?? "",
    preferred_city: p.preferred_city ?? "",
    preferred_relation_scope: p.preferred_relation_scope ?? undefined,
    preferred_gender: p.preferred_gender ?? "both",
  };
}

const ROWS: EditRow[] = [
  {
    id: "display_name",
    label: "Nom affiché",
    icon: User,
    getValue: (p) => p.display_name || "—",
    section: "Identité",
  },
  {
    id: "date_of_birth",
    label: "Date de naissance",
    icon: User,
    getValue: (p) =>
      p.date_of_birth
        ? new Date(p.date_of_birth).toLocaleDateString("fr-FR")
        : "Non renseignée",
  },
  {
    id: "gender",
    label: "Genre",
    icon: User,
    getValue: (p) => (p.gender ? GENDER_LABELS[p.gender] : "—"),
  },
  {
    id: "country_code",
    label: "Pays",
    icon: MapPin,
    getValue: (p) =>
      COUNTRIES.find((c) => c.code === p.country_code)?.name ?? "—",
    section: "Localisation",
  },
  {
    id: "city",
    label: "Ville",
    icon: MapPin,
    getValue: (p) => p.city || "—",
  },
  {
    id: "language",
    label: "Langue",
    icon: MapPin,
    getValue: (p) => (p.language === "en" ? "English" : "Français"),
  },
  {
    id: "bio",
    label: "À propos de moi",
    icon: Heart,
    getValue: (p) => p.bio || "Ajouter une bio…",
    section: "Présentation",
  },
  {
    id: "expectations",
    label: "Ce que je cherche",
    icon: Target,
    getValue: (p) => p.expectations || "Décrivez vos attentes…",
  },
  {
    id: "relationship_type",
    label: "Type de relation",
    icon: Heart,
    getValue: (p) =>
      p.relationship_type
        ? RELATIONSHIP_LABELS[p.relationship_type]
        : "—",
  },
  {
    id: "preferred_relation_scope",
    label: "Portée de recherche",
    icon: Target,
    getValue: (p) =>
      p.preferred_relation_scope
        ? SCOPE_LABELS[p.preferred_relation_scope]
        : "—",
    section: "Préférences",
  },
  {
    id: "preferred_gender",
    label: "Profils à découvrir",
    icon: Heart,
    getValue: (p) =>
      GENDER_PREFERENCE_LABELS[p.preferred_gender ?? "both"] ?? "—",
  },
  {
    id: "phone",
    label: "Téléphone",
    icon: Phone,
    getValue: (p) => p.phone || "Non renseigné",
    section: "Contact",
  },
  {
    id: "email",
    label: "Email",
    icon: Mail,
    getValue: (p) => p.email,
  },
];

interface ProfileEditListProps {
  profile: Profile;
}

export function ProfileEditList({ profile }: ProfileEditListProps) {
  const router = useRouter();
  const [activeField, setActiveField] = useState<FieldKey | null>(null);
  const [form, setForm] = useState<ProfileFormData>(() => profileToForm(profile));
  const [isPending, startTransition] = useTransition();

  const selectClass =
    "flex h-12 w-full rounded-xl border border-input bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  function saveField(field: FieldKey) {
    startTransition(async () => {
      const result = await updateProfile(form);
      if (result.error) {
        toast({ variant: "destructive", title: "Erreur", description: result.error });
      } else {
        toast({ title: "Enregistré" });
        setActiveField(null);
        router.refresh();
      }
    });
  }

  let lastSection = "";

  return (
    <div className="mm-card-elevated mx-auto max-w-lg overflow-hidden">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/60 bg-card px-4 py-3">
        <button
          type="button"
          onClick={() => router.push("/profil")}
          className="rounded-full p-2 hover:bg-muted"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-center text-sm font-semibold text-primary">
            Rempli à {profile.profile_completion}%
          </p>
          <div className="mx-auto mt-1.5 h-1.5 max-w-[140px] overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-secondary transition-all"
              style={{ width: `${profile.profile_completion}%` }}
            />
          </div>
        </div>
        <Link
          href="/profil"
          className="shrink-0 text-sm font-semibold text-secondary hover:underline"
        >
          Aperçu
        </Link>
      </header>

      <div className="px-4 py-4">
        <Button
          variant="default"
          className="h-12 w-full rounded-xl bg-neutral-900 text-base hover:bg-neutral-800"
          asChild
        >
          <Link href="/profil/photos">
            <Camera className="h-5 w-5" />
            Ajouter photos
          </Link>
        </Button>

        <div className="mt-6 divide-y divide-border rounded-2xl border border-border">
          {ROWS.map((row) => {
            const showSection = row.section && row.section !== lastSection;
            if (row.section) lastSection = row.section;
            const isEmail = row.id === "email";

            return (
              <div key={row.id}>
                {showSection && (
                  <p className="bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {row.section}
                  </p>
                )}
                {isEmail ? (
                  <div className="flex items-center gap-3 px-4 py-4">
                    <row.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{row.label}</p>
                      <p className="truncate text-sm font-medium">{row.getValue(profile)}</p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveField(row.id as FieldKey)}
                    className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-muted/30 active:bg-muted/50"
                  >
                    <row.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{row.label}</p>
                      <p className="truncate text-sm font-medium text-primary">
                        {row.getValue(profile)}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Préférences âge — ligne combinée */}
        <button
          type="button"
          onClick={() => setActiveField("preferred_age_min")}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-border px-4 py-4 text-left hover:bg-muted/30"
        >
          <Target className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Âge recherché</p>
            <p className="text-sm font-medium">
              {profile.preferred_age_min && profile.preferred_age_max
                ? `${profile.preferred_age_min} – ${profile.preferred_age_max} ans`
                : "Non renseigné"}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Bottom sheet édition */}
      {activeField && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Fermer"
            onClick={() => setActiveField(null)}
          />
          <div className="relative w-full max-w-md rounded-t-2xl bg-white p-5 pb-8 shadow-xl sm:rounded-2xl">
            <h3 className="font-serif text-lg font-semibold text-primary">
              {ROWS.find((r) => r.id === activeField)?.label ??
                (activeField === "preferred_age_min" ? "Âge recherché" : "Modifier")}
            </h3>

            <div className="mt-4 space-y-4">
              {activeField === "display_name" && (
                <Input
                  className="h-12 text-base"
                  value={form.display_name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, display_name: e.target.value }))
                  }
                />
              )}
              {activeField === "date_of_birth" && (
                <Input
                  type="date"
                  className="h-12"
                  value={form.date_of_birth}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date_of_birth: e.target.value }))
                  }
                />
              )}
              {activeField === "gender" && (
                <select
                  className={selectClass}
                  value={form.gender ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      gender: e.target.value as ProfileFormData["gender"],
                    }))
                  }
                >
                  <option value="">—</option>
                  {Object.entries(GENDER_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              )}
              {activeField === "country_code" && (
                <select
                  className={selectClass}
                  value={form.country_code}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, country_code: e.target.value }))
                  }
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              {activeField === "city" && (
                <Input
                  className="h-12"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              )}
              {activeField === "language" && (
                <select
                  className={selectClass}
                  value={form.language}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, language: e.target.value }))
                  }
                >
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              )}
              {activeField === "bio" && (
                <Textarea
                  rows={5}
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                  placeholder="Parlez de vous…"
                />
              )}
              {activeField === "expectations" && (
                <Textarea
                  rows={5}
                  value={form.expectations}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, expectations: e.target.value }))
                  }
                  placeholder="Ce que vous recherchez…"
                />
              )}
              {activeField === "relationship_type" && (
                <select
                  className={selectClass}
                  value={form.relationship_type ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      relationship_type: e.target.value as ProfileFormData["relationship_type"],
                    }))
                  }
                >
                  <option value="">—</option>
                  {Object.entries(RELATIONSHIP_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              )}
              {activeField === "preferred_relation_scope" && (
                <select
                  className={selectClass}
                  value={form.preferred_relation_scope ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      preferred_relation_scope: e.target.value as ProfileFormData["preferred_relation_scope"],
                    }))
                  }
                >
                  <option value="">—</option>
                  {Object.entries(SCOPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              )}
              {activeField === "preferred_gender" && (
                <select
                  className={selectClass}
                  value={form.preferred_gender ?? "both"}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      preferred_gender: e.target.value as ProfileFormData["preferred_gender"],
                    }))
                  }
                >
                  {Object.entries(GENDER_PREFERENCE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              )}
              {activeField === "phone" && (
                <Input
                  type="tel"
                  className="h-12"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              )}
              {activeField === "preferred_age_min" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Min</Label>
                    <Input
                      type="number"
                      min={18}
                      className="mt-1 h-12"
                      value={form.preferred_age_min ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          preferred_age_min: Number(e.target.value) || undefined,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Max</Label>
                    <Input
                      type="number"
                      min={18}
                      className="mt-1 h-12"
                      value={form.preferred_age_max ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          preferred_age_max: Number(e.target.value) || undefined,
                        }))
                      }
                    />
                  </div>
                </div>
              )}

              <Button
                variant="secondary"
                className="h-12 w-full text-base"
                disabled={isPending}
                onClick={() => saveField(activeField)}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
