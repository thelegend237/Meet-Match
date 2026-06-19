"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Cake,
  Camera,
  Compass,
  Globe,
  Heart,
  HeartHandshake,
  Loader2,
  Mail,
  MapPin,
  Sparkles,
  Target,
  User,
  UserCircle,
  Users,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createClient } from "@/lib/supabase/client";
import { cn, formatCurrency } from "@/lib/utils";
import { getRegistrationFee } from "@/lib/pricing";
import { calculateProfileCompletion } from "@/lib/profile/completion";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  getInscriptionPhase,
  getPublicStepSubtitle,
  getPublicStepTitle,
  phaseProgressPercent,
} from "@/lib/onboarding/step-groups";
import {
  InscriptionFormCard,
  InscriptionPageLayout,
  IconInput,
  LoginHint,
  PasswordField,
  PrimaryFormButton,
  RegisterAgeRange,
  RegisterChoiceGrid,
  RegisterChoiceRow,
  RegisterCompletion,
  RegisterHint,
  RegisterPhotoUpload,
  RegisterSkipButton,
  RegisterStep,
  RegisterStepFooter,
  RegisterTextarea,
} from "@/components/public/inscription/inscription-ui";
import { LocationPicker } from "@/components/geo/location-picker";
import {
  getStepsForMode,
  parseStepParam,
  nextStepId,
  prevStepId,
  progressPercent,
  type OnboardingStepId,
} from "@/lib/onboarding/steps";
import {
  onboardingAccountSchema,
  onboardingCredentialsSchema,
  onboardingLocationSchema,
} from "@/lib/validations/onboarding";
import {
  getOnboardingProfile,
  saveOnboardingIdentity,
  saveOnboardingPresentation,
  saveOnboardingPreferences,
  syncOnboardingGeolocation,
} from "@/lib/actions/onboarding";
import { uploadProfilePhoto } from "@/lib/actions/photos";
import {
  GENDER_LABELS,
  RELATIONSHIP_LABELS,
  SCOPE_LABELS,
  GENDER_PREFERENCE_LABELS,
} from "@/lib/validations/profile";
import type { Profile } from "@/lib/types/database";
import {
  OnboardingShell,
  StepIllustration,
  StepHeader,
  StepBody,
  StepFooter,
  ChoiceRow,
  ChoiceGrid,
  SkipOption,
  LargeInput,
  LargeTextarea,
  FieldLabel,
} from "@/components/public/onboarding/onboarding-ui";
import { Button } from "@/components/ui/button";
import { ToastAction } from "@/components/ui/toast";
import { SocialAuthButtons, AuthDivider } from "@/components/auth/social-auth-buttons";
import { LanguageMultiSelect } from "@/components/ui/language-multi-select";
import { getProfileLanguages, type SpokenLanguageCode } from "@/lib/languages";
import {
  MAX_PROFILE_PHOTO_MB,
  PROFILE_PHOTO_ACCEPT,
  validateProfilePhotoFile,
} from "@/lib/photos/limits";
import { PROFILE_PHOTO_ANTI_FAKE_ONBOARDING } from "@/lib/photos/copy";
import { StepTransition } from "@/components/motion/motion";

type WizardMode = "public" | "continue";

interface OnboardingWizardProps {
  mode?: WizardMode;
  embedded?: boolean;
  initialProfile?: Profile | null;
  initialStepParam?: string | null;
  className?: string;
}

type WizardData = {
  display_name: string;
  email: string;
  password: string;
  country_code: string;
  city: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  languages: SpokenLanguageCode[];
  bio: string;
  expectations: string;
  relationship_type: string;
  preferred_gender: string;
  preferred_age_min: number;
  preferred_age_max: number;
  preferred_relation_scope: string;
};

function profileToData(p: Profile | null): Partial<WizardData> {
  if (!p) return {};
  return {
    display_name: p.display_name ?? "",
    email: p.email ?? "",
    country_code: p.country_code ?? "FR",
    city: p.city ?? "",
    phone: p.phone ?? "",
    gender: p.gender ?? "",
    date_of_birth: p.date_of_birth ?? "",
    languages: getProfileLanguages(p) as SpokenLanguageCode[],
    bio: p.bio ?? "",
    expectations: p.expectations ?? "",
    relationship_type: p.relationship_type ?? "",
    preferred_gender: p.preferred_gender ?? "both",
    preferred_age_min: p.preferred_age_min ?? 25,
    preferred_age_max: p.preferred_age_max ?? 45,
    preferred_relation_scope: p.preferred_relation_scope ?? "",
  };
}

const GENDER_OPTIONS = Object.entries(GENDER_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const RELATIONSHIP_OPTIONS = Object.entries(RELATIONSHIP_LABELS).map(
  ([value, label]) => ({ value, label })
);

const SCOPE_OPTIONS = Object.entries(SCOPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const SEEK_GENDER_OPTIONS = Object.entries(GENDER_PREFERENCE_LABELS).map(
  ([value, label]) => ({ value, label })
);

const RELATIONSHIP_DESCRIPTIONS: Record<string, string> = {
  serious: "Construire une relation durable et sincère",
  friendship: "Rencontrer des personnes bienveillantes",
  marriage: "Projet de vie et engagement à long terme",
  other: "Autre intention — à préciser plus tard",
};

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  local: "Profils près de chez vous",
  national: "Dans l'ensemble du pays",
  international: "Sans limite géographique",
};

export function OnboardingWizard({
  mode = "public",
  embedded = false,
  initialProfile = null,
  initialStepParam = null,
  className,
}: OnboardingWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const steps = useMemo(() => getStepsForMode(mode), [mode]);

  const [accountCreated, setAccountCreated] = useState(
    mode === "continue" || !!initialProfile
  );
  const [completion, setCompletion] = useState(
    initialProfile?.profile_completion ?? 0
  );
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialProfile?.primary_photo_url ?? null
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [data, setData] = useState<WizardData>(() => ({
    display_name: "",
    email: "",
    password: "",
    country_code: "FR",
    city: "",
    phone: "",
    gender: "",
    date_of_birth: "",
    languages: [],
    bio: "",
    expectations: "",
    relationship_type: "",
    preferred_gender: "both",
    preferred_age_min: 25,
    preferred_age_max: 45,
    preferred_relation_scope: "",
    ...profileToData(initialProfile),
  }));

  const initialStep = parseStepParam(
    initialStepParam ?? searchParams.get("step"),
    steps
  );

  const [currentStep, setCurrentStep] = useState<OnboardingStepId>(initialStep);

  const progress =
    mode === "public"
      ? phaseProgressPercent(currentStep)
      : progressPercent(steps, currentStep);
  const regFee = getRegistrationFee(data.country_code);

  const liveCompletion = useMemo(
    () =>
      calculateProfileCompletion({
        display_name: data.display_name,
        country_code: data.country_code,
        city: data.city,
        phone: data.phone,
        gender: data.gender || null,
        date_of_birth: data.date_of_birth || null,
        languages: data.languages,
        bio: data.bio,
        expectations: data.expectations,
        relationship_type: data.relationship_type || null,
        preferred_age_min: data.preferred_age_min,
        preferred_age_max: data.preferred_age_max,
        preferred_relation_scope: data.preferred_relation_scope || null,
        primary_photo_url: photoPreview,
      }),
    [data, photoPreview]
  );

  const displayCompletion = accountCreated ? completion : liveCompletion;

  const goTo = useCallback(
    (step: OnboardingStepId) => {
      setCurrentStep(step);
      if (mode === "public") {
        router.replace(`/inscription?step=${step}`, { scroll: false });
      } else if (mode === "continue" || accountCreated) {
        router.replace(`/onboarding?step=${step}`, { scroll: false });
      }
    },
    [mode, accountCreated, router]
  );

  const goNext = useCallback(() => {
    const next = nextStepId(steps, currentStep);
    if (next) goTo(next);
  }, [steps, currentStep, goTo]);

  const goBack = useCallback(() => {
    const prev = prevStepId(steps, currentStep);
    if (prev) goTo(prev);
  }, [steps, currentStep, goTo]);

  const patch = useCallback((partial: Partial<WizardData>) => {
    setData((d) => ({ ...d, ...partial }));
  }, []);

  async function finishAccountSession(
    d: {
      display_name: string;
      country_code: string;
      city: string;
      phone?: string;
    },
    message: { title: string; description: string }
  ) {
    setAccountCreated(true);
    setCompletion(
      calculateProfileCompletion({
        display_name: d.display_name,
        country_code: d.country_code,
        city: d.city,
        phone: d.phone,
        languages: [],
      })
    );
    toast(message);
    return true;
  }

  /** Reprend un compte Auth créé lors d'une inscription précédente interrompue */
  async function tryRecoverExistingAccount(
    d: {
      display_name: string;
      email: string;
      password: string;
      country_code: string;
      city: string;
      phone?: string;
    }
  ) {
    const supabase = createClient();
    const { data: signIn, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: d.email.trim(),
        password: d.password,
      });

    if (signInError || !signIn.session) return false;

    const phone = d.phone?.trim() || null;
    await supabase
      .from("profiles")
      .update({
        display_name: d.display_name.trim(),
        country_code: d.country_code,
        city: d.city.trim(),
        phone,
      })
      .eq("id", signIn.user.id);

    return finishAccountSession(
      {
        display_name: d.display_name,
        country_code: d.country_code,
        city: d.city,
        phone: phone ?? undefined,
      },
      {
        title: "Compte retrouvé",
        description:
          "Votre inscription avait déjà commencé — poursuivez la personnalisation du profil.",
      }
    );
  }

  async function createAccount() {
    const parsed = onboardingAccountSchema.safeParse({
      display_name: data.display_name,
      email: data.email,
      password: data.password,
      country_code: data.country_code,
      city: data.city,
      phone: data.phone,
    });
    if (!parsed.success) {
      throw new Error(parsed.error.errors[0]?.message ?? "Données invalides");
    }

    const supabase = createClient();
    const d = parsed.data;
    const phone = d.phone?.trim() || undefined;
    const payload = {
      display_name: d.display_name.trim(),
      email: d.email.trim(),
      password: d.password,
      country_code: d.country_code,
      city: d.city.trim(),
      phone,
    };

    const { data: authData, error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          display_name: payload.display_name,
          phone: phone ?? null,
          country_code: payload.country_code,
          city: payload.city,
        },
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      const emailTaken =
        msg.includes("already registered") ||
        msg.includes("already been registered") ||
        msg.includes("user already registered");

      if (emailTaken) {
        const recovered = await tryRecoverExistingAccount(payload);
        if (recovered) return true;
        throw new Error("EMAIL_ALREADY_USED");
      }
      if (msg.includes("database error saving new user")) {
        throw new Error(
          "Erreur lors de la création du profil. Vérifiez que la migration Supabase 008 est appliquée."
        );
      }
      throw new Error(error.message);
    }

    if (!authData.session) {
      toast({
        title: "Compte créé",
        description: "Confirmez votre email puis connectez-vous.",
      });
      router.push("/connexion");
      return false;
    }

    return finishAccountSession(
      {
        display_name: payload.display_name,
        country_code: payload.country_code,
        city: payload.city,
        phone,
      },
      {
        title: "Bienvenue !",
        description: "Quelques questions pour personnaliser votre profil.",
      }
    );
  }

  async function persistIdentity(clear = false) {
    const result = await saveOnboardingIdentity({
      date_of_birth: clear ? "" : data.date_of_birth,
      gender: clear
        ? ""
        : (data.gender as "" | "male" | "female" | "other" | "prefer_not_say"),
      languages: clear ? [] : data.languages,
      phone: data.phone,
    });
    if (result.profile_completion != null) setCompletion(result.profile_completion);
    if (result.error) throw new Error(result.error);
  }

  async function persistPresentation(clear = false) {
    const result = await saveOnboardingPresentation({
      bio: clear ? "" : data.bio,
      expectations: clear ? "" : data.expectations,
      relationship_type: clear
        ? ""
        : (data.relationship_type as
            | ""
            | "serious"
            | "friendship"
            | "marriage"
            | "other"),
    });
    if (result.profile_completion != null) setCompletion(result.profile_completion);
    if (result.error) throw new Error(result.error);
  }

  async function persistPreferences(clear = false) {
    const result = await saveOnboardingPreferences({
      preferred_age_min: clear ? undefined : data.preferred_age_min,
      preferred_age_max: clear ? undefined : data.preferred_age_max,
      preferred_relation_scope: clear
        ? ""
        : (data.preferred_relation_scope as
            | ""
            | "local"
            | "national"
            | "international"),
      preferred_gender: clear
        ? ""
        : (data.preferred_gender as "" | "male" | "female" | "both"),
      preferred_country_code: "",
      preferred_city: "",
    });
    if (result.profile_completion != null) setCompletion(result.profile_completion);
    if (result.error) throw new Error(result.error);
  }

  function handleNext() {
    startTransition(async () => {
      try {
        switch (currentStep) {
          case "account": {
            if (mode === "public") {
              const creds = onboardingCredentialsSchema.safeParse({
                display_name: data.display_name,
                email: data.email,
                password: data.password,
              });
              const loc = onboardingLocationSchema.safeParse({
                country_code: data.country_code,
                city: data.city,
                phone: data.phone,
              });
              if (!creds.success) {
                toast({
                  variant: "destructive",
                  title: "Vérifiez les champs",
                  description: creds.error.errors[0]?.message,
                });
                return;
              }
              if (!loc.success) {
                toast({
                  variant: "destructive",
                  title: "Vérifiez les champs",
                  description: loc.error.errors[0]?.message,
                });
                return;
              }
              if (!accountCreated) {
                const ok = await createAccount();
                if (!ok) return;
              }
              await syncOnboardingGeolocation();
              goTo("gender");
              return;
            }

            const parsed = onboardingCredentialsSchema.safeParse({
              display_name: data.display_name,
              email: data.email,
              password: data.password,
            });
            if (!parsed.success) {
              toast({
                variant: "destructive",
                title: "Vérifiez les champs",
                description: parsed.error.errors[0]?.message,
              });
              return;
            }
            goNext();
            break;
          }
          case "location":
            break;

          case "language":
            await persistIdentity();
            goNext();
            break;
          case "relationship":
            await persistPresentation();
            goNext();
            break;
          case "scope":
            await persistPreferences();
            goNext();
            break;
          case "photo":
            if (!photoFile && !photoPreview) {
              toast({
                variant: "destructive",
                title: "Photo requise",
                description: PROFILE_PHOTO_ANTI_FAKE_ONBOARDING,
              });
              return;
            }
            if (photoFile) {
              const fd = new FormData();
              fd.set("file", photoFile);
              fd.set("isPrimary", "true");
              const result = await uploadProfilePhoto(fd);
              if (result.error) throw new Error(result.error);
              if (result.url) setPhotoPreview(result.url);
              const refreshed = await getOnboardingProfile();
              if (refreshed.profile) {
                setCompletion(refreshed.profile.profile_completion);
              }
            }
            goNext();
            break;
          case "done": {
            const refreshed = await getOnboardingProfile();
            const pay =
              refreshed.profile?.registration_payment_status ??
              initialProfile?.registration_payment_status;
            router.push("/decouvrir?welcome=1");
            router.refresh();
            break;
          }
          default:
            goNext();
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Une erreur est survenue.";

        if (message === "EMAIL_ALREADY_USED") {
          toast({
            variant: "destructive",
            title: "Cet email est déjà inscrit",
            description:
              "Connectez-vous si c'est votre compte, ou utilisez une autre adresse email.",
            action: (
              <ToastAction
                altText="Se connecter"
                onClick={() => router.push("/connexion")}
              >
                Se connecter
              </ToastAction>
            ),
          });
          return;
        }

        toast({
          variant: "destructive",
          title: "Erreur",
          description: message,
        });
      }
    });
  }

  function skipWithoutSave() {
    goNext();
  }

  function handleSkip() {
    startTransition(async () => {
      try {
        if (currentStep === "language") await persistIdentity(true);
        if (currentStep === "relationship") await persistPresentation(true);
        if (currentStep === "scope") await persistPreferences(true);
        goNext();
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: err instanceof Error ? err.message : "Une erreur est survenue.",
        });
      }
    });
  }

  function selectPhotoFile(file: File) {
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function handlePhotoFileInput(
    file: File | undefined,
    resetInput?: HTMLInputElement | null
  ) {
    if (!file) return;
    const validationError = validateProfilePhotoFile(file);
    if (validationError) {
      toast({
        variant: "destructive",
        title: "Photo refusée",
        description: validationError,
      });
      if (resetInput) resetInput.value = "";
      return;
    }
    selectPhotoFile(file);
  }

  const stepOptional = steps.find((s) => s.id === currentStep)?.optional ?? false;
  const showFooterSkip =
    stepOptional && currentStep !== "done" && currentStep !== "photo";

  useEffect(() => {
    if (mode === "continue" && initialProfile) {
      setCompletion(initialProfile.profile_completion);
    }
  }, [initialProfile, mode]);

  const renderStep = () => {
    switch (currentStep) {
      case "account":
        if (mode === "public") {
          const landingForm = embedded;

          if (landingForm) {
            return (
              <div className="space-y-4">
                <IconInput
                  icon={User}
                  label="Nom affiché"
                  value={data.display_name}
                  onChange={(e) => patch({ display_name: e.target.value })}
                  autoComplete="name"
                  placeholder="Ex : Sophie"
                />
                <IconInput
                  icon={Mail}
                  label="Email"
                  type="email"
                  value={data.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  autoComplete="email"
                  placeholder="Ex : sophie@email.com"
                />
                <PasswordField
                  value={data.password}
                  onChange={(password) => patch({ password })}
                  compactStrength
                />
                <LocationPicker
                  countryCode={data.country_code}
                  city={data.city}
                  onCountryChange={(country_code) => patch({ country_code })}
                  onCityChange={(city) => patch({ city })}
                />
              </div>
            );
          }

          return (
            <RegisterStep icon={UserCircle} className="space-y-5">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Identité
                </p>
                <IconInput
                  icon={User}
                  label="Nom affiché"
                  value={data.display_name}
                  onChange={(e) => patch({ display_name: e.target.value })}
                  autoComplete="name"
                  placeholder="Ex : Sophie"
                />
                <IconInput
                  icon={Mail}
                  label="Email"
                  type="email"
                  value={data.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  autoComplete="email"
                  placeholder="Ex : sophie@email.com"
                />
                <PasswordField
                  value={data.password}
                  onChange={(password) => patch({ password })}
                />
              </div>

              <div className="space-y-4 border-t border-border/40 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Localisation
                </p>
                <LocationPicker
                  countryCode={data.country_code}
                  city={data.city}
                  onCountryChange={(country_code) => patch({ country_code })}
                  onCityChange={(city) => patch({ city })}
                />
                <IconInput
                  icon={MapPin}
                  label="Téléphone (optionnel)"
                  type="tel"
                  value={data.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>

              <RegisterHint tone="accent">
                Inscription :{" "}
                <strong className="text-primary">
                  {formatCurrency(regFee.amount, regFee.currency)}
                </strong>{" "}
                après création — les étapes suivantes sont facultatives.
              </RegisterHint>

              <div className="space-y-4 border-t border-border/40 pt-5">
                <SocialAuthButtons />
                <AuthDivider />
              </div>
            </RegisterStep>
          );
        }

        return (
          <>
            <StepIllustration icon={UserCircle} />
            <StepHeader
              title="Comment vous appeler ?"
              subtitle="Ces informations créent votre compte Meet & Match."
            />
            <StepBody className="space-y-4">
              <div>
                <FieldLabel>Prénom ou pseudo</FieldLabel>
                <LargeInput
                  value={data.display_name}
                  onChange={(e) => patch({ display_name: e.target.value })}
                  autoComplete="name"
                  placeholder="Ex. Sophie"
                />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <LargeInput
                  type="email"
                  value={data.email}
                  onChange={(e) => patch({ email: e.target.value })}
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  disabled={mode === "continue"}
                />
              </div>
            </StepBody>
          </>
        );

      case "location":
        if (mode === "public") return null;
        return (
          <>
            <StepIllustration icon={MapPin} gradient="from-primary/10 via-accent to-secondary/10" />
            <StepHeader
              title="Où habitez-vous ?"
              subtitle="Pour vous proposer des profils pertinents près de chez vous."
            />
            <StepBody className="space-y-4">
              <LocationPicker
                countryCode={data.country_code}
                city={data.city}
                onCountryChange={(country_code) => patch({ country_code })}
                onCityChange={(city) => patch({ city })}
              />
              <div>
                <FieldLabel>Téléphone (optionnel)</FieldLabel>
                <LargeInput
                  type="tel"
                  value={data.phone}
                  onChange={(e) => patch({ phone: e.target.value })}
                  placeholder="+33 6 12 34 56 78"
                />
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Déjà un compte ?{" "}
                <Link
                  href="/connexion"
                  className="font-medium text-secondary hover:underline"
                >
                  Se connecter
                </Link>
              </p>
            </StepBody>
          </>
        );

      case "gender":
        if (mode === "public") {
          return (
            <RegisterStep icon={User} optional>
              <div className="space-y-2.5">
                {GENDER_OPTIONS.map((opt) => (
                  <RegisterChoiceRow
                    key={opt.value}
                    label={opt.label}
                    selected={data.gender === opt.value}
                    onSelect={() => patch({ gender: opt.value })}
                  />
                ))}
                <RegisterSkipButton onClick={skipWithoutSave} />
              </div>
            </RegisterStep>
          );
        }
        return (
          <>
            <StepIllustration icon={User} />
            <StepHeader title="Vous êtes ?" optional />
            <StepBody className="space-y-2">
              {GENDER_OPTIONS.map((opt) => (
                <ChoiceRow
                  key={opt.value}
                  label={opt.label}
                  selected={data.gender === opt.value}
                  onSelect={() => patch({ gender: opt.value })}
                />
              ))}
              <SkipOption onClick={skipWithoutSave} />
            </StepBody>
          </>
        );

      case "birthdate":
        if (mode === "public") {
          return (
            <RegisterStep icon={Cake} optional>
              <LargeInput
                type="date"
                value={data.date_of_birth}
                onChange={(e) => patch({ date_of_birth: e.target.value })}
                max={new Date().toISOString().slice(0, 10)}
                className="rounded-xl border-border/60 bg-[#faf8fc] px-4 py-3.5 focus:border-secondary/40 focus:bg-white focus:ring-2 focus:ring-secondary/15"
              />
              <RegisterSkipButton onClick={skipWithoutSave} />
            </RegisterStep>
          );
        }
        return (
          <>
            <StepIllustration icon={Cake} />
            <StepHeader
              title="Quelle est votre date de naissance ?"
              subtitle="Votre âge sera visible sur votre profil."
              optional
            />
            <StepBody>
              <LargeInput
                type="date"
                value={data.date_of_birth}
                onChange={(e) => patch({ date_of_birth: e.target.value })}
                max={new Date().toISOString().slice(0, 10)}
              />
              <SkipOption onClick={skipWithoutSave} />
            </StepBody>
          </>
        );

      case "language":
        if (mode === "public") {
          return (
            <RegisterStep icon={Globe} optional>
              <LanguageMultiSelect
                variant="register"
                value={data.languages}
                onChange={(languages) => patch({ languages })}
              />
              <RegisterSkipButton onClick={handleSkip} />
            </RegisterStep>
          );
        }
        return (
          <>
            <StepIllustration icon={Globe} />
            <StepHeader
              title="Quelles langues parlez-vous ?"
              subtitle="Sélectionnez toutes les langues que vous maîtrisez."
              optional
            />
            <StepBody>
              <LanguageMultiSelect
                value={data.languages}
                onChange={(languages) => patch({ languages })}
              />
              <SkipOption onClick={handleSkip} />
            </StepBody>
          </>
        );

      case "bio":
        if (mode === "public") {
          return (
            <RegisterStep icon={Sparkles} optional>
              <RegisterTextarea
                value={data.bio}
                onChange={(bio) => patch({ bio })}
                placeholder="Qui êtes-vous, vos passions, votre personnalité…"
                minHint={20}
              />
              <RegisterSkipButton onClick={skipWithoutSave} />
            </RegisterStep>
          );
        }
        return (
          <>
            <StepIllustration icon={Sparkles} />
            <StepHeader
              title="Parlez-nous de vous"
              subtitle="20 caractères minimum pour compléter cette section."
              optional
            />
            <StepBody>
              <LargeTextarea
                value={data.bio}
                onChange={(e) => patch({ bio: e.target.value })}
                placeholder="Qui êtes-vous, vos passions, votre personnalité…"
              />
              <p className="mt-2 text-right text-xs text-muted-foreground">
                {data.bio.trim().length} caractères
              </p>
              <SkipOption onClick={skipWithoutSave} />
            </StepBody>
          </>
        );

      case "expectations":
        if (mode === "public") {
          return (
            <RegisterStep icon={Target} optional>
              <RegisterTextarea
                value={data.expectations}
                onChange={(expectations) => patch({ expectations })}
                placeholder="Type de relation, valeurs importantes, ce que vous attendez…"
              />
              <RegisterSkipButton onClick={skipWithoutSave} />
            </RegisterStep>
          );
        }
        return (
          <>
            <StepIllustration icon={Target} />
            <StepHeader
              title="Que recherchez-vous ?"
              subtitle="Soyez sincère : cela aide nos administrateurs."
              optional
            />
            <StepBody>
              <LargeTextarea
                value={data.expectations}
                onChange={(e) => patch({ expectations: e.target.value })}
                placeholder="Type de relation, valeurs importantes…"
              />
              <SkipOption onClick={skipWithoutSave} />
            </StepBody>
          </>
        );

      case "relationship":
        if (mode === "public") {
          return (
            <RegisterStep icon={Heart} optional>
              <div className="space-y-2.5">
                {RELATIONSHIP_OPTIONS.map((opt) => (
                  <RegisterChoiceRow
                    key={opt.value}
                    label={opt.label}
                    description={RELATIONSHIP_DESCRIPTIONS[opt.value]}
                    selected={data.relationship_type === opt.value}
                    onSelect={() => patch({ relationship_type: opt.value })}
                  />
                ))}
                <RegisterSkipButton onClick={handleSkip} />
              </div>
            </RegisterStep>
          );
        }
        return (
          <>
            <StepIllustration icon={Heart} />
            <StepHeader title="Quel type de relation visez-vous ?" optional />
            <StepBody className="space-y-2">
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <ChoiceRow
                  key={opt.value}
                  label={opt.label}
                  selected={data.relationship_type === opt.value}
                  onSelect={() => patch({ relationship_type: opt.value })}
                />
              ))}
              <SkipOption onClick={handleSkip} />
            </StepBody>
          </>
        );

      case "seek_gender":
        if (mode === "public") {
          return (
            <RegisterStep icon={Users} optional>
              <div className="space-y-2.5">
                {SEEK_GENDER_OPTIONS.map((opt) => (
                  <RegisterChoiceRow
                    key={opt.value}
                    label={opt.label}
                    selected={data.preferred_gender === opt.value}
                    onSelect={() => patch({ preferred_gender: opt.value })}
                  />
                ))}
                <RegisterSkipButton onClick={skipWithoutSave} />
              </div>
            </RegisterStep>
          );
        }
        return (
          <>
            <StepIllustration icon={Users} />
            <StepHeader title="Qui souhaitez-vous rencontrer ?" optional />
            <StepBody className="space-y-2">
              {SEEK_GENDER_OPTIONS.map((opt) => (
                <ChoiceRow
                  key={opt.value}
                  label={opt.label}
                  selected={data.preferred_gender === opt.value}
                  onSelect={() => patch({ preferred_gender: opt.value })}
                />
              ))}
              <SkipOption onClick={skipWithoutSave} />
            </StepBody>
          </>
        );

      case "age_range":
        if (mode === "public") {
          return (
            <RegisterStep icon={Cake} optional>
              <RegisterAgeRange
                min={data.preferred_age_min}
                max={data.preferred_age_max}
                onMinChange={(preferred_age_min) =>
                  patch({ preferred_age_min })
                }
                onMaxChange={(preferred_age_max) =>
                  patch({ preferred_age_max })
                }
              />
              <RegisterSkipButton onClick={skipWithoutSave} />
            </RegisterStep>
          );
        }
        return (
          <>
            <StepIllustration icon={Cake} gradient="from-secondary/15 to-accent" />
            <StepHeader
              title="Quelle tranche d'âge recherchez-vous ?"
              optional
            />
            <StepBody className="space-y-6">
              <div className="rounded-2xl bg-muted/30 px-4 py-5 text-center">
                <p className="font-sans text-3xl font-bold text-primary">
                  {data.preferred_age_min} – {data.preferred_age_max} ans
                </p>
              </div>
              <FieldLabel
                control={
                  <input
                    type="range"
                    min={18}
                    max={80}
                    value={data.preferred_age_min}
                    aria-label="Âge minimum"
                    onChange={(e) => {
                      const min = Number(e.target.value);
                      patch({
                        preferred_age_min: min,
                        preferred_age_max: Math.max(min, data.preferred_age_max),
                      });
                    }}
                    className="mt-2 h-2 w-full cursor-pointer accent-secondary"
                  />
                }
              >
                Âge minimum
              </FieldLabel>
              <FieldLabel
                control={
                  <input
                    type="range"
                    min={18}
                    max={80}
                    value={data.preferred_age_max}
                    aria-label="Âge maximum"
                    onChange={(e) => {
                      const max = Number(e.target.value);
                      patch({
                        preferred_age_max: max,
                        preferred_age_min: Math.min(max, data.preferred_age_min),
                      });
                    }}
                    className="mt-2 h-2 w-full cursor-pointer accent-secondary"
                  />
                }
              >
                Âge maximum
              </FieldLabel>
              <SkipOption onClick={skipWithoutSave} />
            </StepBody>
          </>
        );

      case "scope":
        if (mode === "public") {
          return (
            <RegisterStep icon={Compass} optional>
              <div className="space-y-2.5">
                {SCOPE_OPTIONS.map((opt) => (
                  <RegisterChoiceRow
                    key={opt.value}
                    label={opt.label}
                    description={SCOPE_DESCRIPTIONS[opt.value]}
                    selected={data.preferred_relation_scope === opt.value}
                    onSelect={() => patch({ preferred_relation_scope: opt.value })}
                  />
                ))}
                <RegisterSkipButton onClick={handleSkip} />
              </div>
            </RegisterStep>
          );
        }
        return (
          <>
            <StepIllustration icon={Compass} />
            <StepHeader title="Quelle portée de recherche ?" optional />
            <StepBody className="space-y-2">
              {SCOPE_OPTIONS.map((opt) => (
                <ChoiceRow
                  key={opt.value}
                  label={opt.label}
                  selected={data.preferred_relation_scope === opt.value}
                  onSelect={() => patch({ preferred_relation_scope: opt.value })}
                />
              ))}
              <SkipOption onClick={handleSkip} />
            </StepBody>
          </>
        );

      case "photo":
        if (mode === "public") {
          return (
            <RegisterStep icon={Camera}>
              <RegisterPhotoUpload
                preview={photoPreview}
                onFileSelect={selectPhotoFile}
                onError={(message) =>
                  toast({
                    variant: "destructive",
                    title: "Photo refusée",
                    description: message,
                  })
                }
              />
            </RegisterStep>
          );
        }
        return (
          <>
            <StepIllustration icon={Camera} />
            <StepHeader
              title="Ajoutez votre plus belle photo"
              subtitle={PROFILE_PHOTO_ANTI_FAKE_ONBOARDING}
            />
            <StepBody>
              <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-border/70 bg-muted/15 py-10">
                {photoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- blob URL preview
                  <img
                    src={photoPreview}
                    alt="Aperçu de votre photo de profil"
                    className="h-36 w-36 rounded-full object-cover ring-4 ring-secondary/20"
                  />
                ) : (
                  <div className="flex h-36 w-36 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-secondary/15">
                    <Camera className="h-12 w-12 text-secondary/50" />
                  </div>
                )}
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  JPG, PNG ou WebP — max {MAX_PROFILE_PHOTO_MB} Mo
                </p>
                <label className="mt-4 cursor-pointer rounded-full bg-secondary px-6 py-3 text-sm font-semibold text-secondary-foreground shadow-md">
                  Choisir une photo
                  <input
                    type="file"
                    accept={PROFILE_PHOTO_ACCEPT}
                    className="sr-only"
                    onChange={(e) => {
                      handlePhotoFileInput(e.target.files?.[0], e.target);
                    }}
                  />
                </label>
              </div>
            </StepBody>
          </>
        );

      case "done":
        if (mode === "public") {
          return (
            <RegisterStep icon={HeartHandshake}>
              <RegisterCompletion percent={displayCompletion} />
              <Button variant="outline" className="w-full rounded-xl" asChild>
                <Link href="/profil/modifier">Compléter plus tard</Link>
              </Button>
            </RegisterStep>
          );
        }
        return (
          <>
            <StepIllustration icon={HeartHandshake} gradient="from-secondary/25 to-accent" />
            <StepHeader
              title={
                displayCompletion >= 100
                  ? "Profil complet à 100 % !"
                  : `Profil à ${displayCompletion} % — c'est un bon début`
              }
              subtitle="Vous pourrez enrichir votre profil à tout moment depuis l'application."
            />
            <StepBody className="flex flex-col items-center gap-4 py-4">
              <div className="w-full rounded-2xl bg-muted/30 p-4">
                <progress
                  value={displayCompletion}
                  max={100}
                  aria-label="Complétion du profil"
                  className="h-2 w-full appearance-none overflow-hidden rounded-full bg-muted [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-secondary [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-secondary"
                />
                <p className="mt-2 text-center text-sm text-muted-foreground">
                  Complétion du profil
                </p>
              </div>
              <Button variant="outline" className="w-full rounded-full" asChild>
                <Link href="/profil/modifier">Compléter plus tard</Link>
              </Button>
            </StepBody>
          </>
        );

      default:
        return null;
    }
  };

  const usesCustomFooter = false;
  const isPublicAccountStep = mode === "public" && currentStep === "account";

  const stepContent = renderStep();

  if (mode === "public") {
    const formCard = (
      <>
        <InscriptionFormCard
          title={getPublicStepTitle(currentStep)}
          subtitle={getPublicStepSubtitle(currentStep)}
          step={currentStep}
          phase={getInscriptionPhase(currentStep)}
          variant={embedded ? "landing" : "default"}
          footer={
            isPublicAccountStep ? (
              <div className="space-y-4">
                <PrimaryFormButton pending={pending} onClick={handleNext}>
                  {pending ? "Création du compte…" : "Créer mon compte"}
                </PrimaryFormButton>
                <LoginHint />
              </div>
            ) : (
              <RegisterStepFooter
                onBack={prevStepId(steps, currentStep) ? goBack : undefined}
                onNext={handleNext}
                onSkip={showFooterSkip ? handleSkip : undefined}
                progress={progress}
                pending={pending}
                showBack={currentStep !== "account"}
                nextLabel={
                  currentStep === "done" ? "Terminer" : "Continuer"
                }
                skipLabel={
                  currentStep === "photo"
                    ? "Passer pour l'instant"
                    : "Je préfère ne pas le dire"
                }
              />
            )
          }
        >
          <StepTransition stepKey={currentStep}>{stepContent}</StepTransition>
        </InscriptionFormCard>
      </>
    );

    return (
      <div className={cn("w-full", className)}>
        {embedded ? (
          formCard
        ) : (
          <InscriptionPageLayout>{formCard}</InscriptionPageLayout>
        )}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <OnboardingShell>
        {stepContent}
        {!usesCustomFooter && (
          <StepFooter
            onBack={prevStepId(steps, currentStep) ? goBack : undefined}
            onNext={handleNext}
            onSkip={showFooterSkip ? handleSkip : undefined}
            progress={progress}
            pending={pending}
            showBack={currentStep !== "account"}
            skipLabel={
              currentStep === "photo"
                ? "Passer pour l'instant"
                : "Je préfère ne pas le dire"
            }
          />
        )}
      </OnboardingShell>
    </div>
  );
}
