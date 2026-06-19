"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Send,
  User,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { contactSchema, type ContactFormData } from "@/lib/validations/contact";
import { cn } from "@/lib/utils";

function buildDefaultMessage(subject: string | null, profile: string | null) {
  if (subject === "signalement" && profile) {
    return `Signalement du profil « ${profile} ».\n\nMotif : `;
  }
  if (subject === "acces-gratuit") {
    return "Bonjour,\n\nJe souhaite demander un accès gratuit pour la raison suivante :\n\n";
  }
  return "";
}

function ContactField({
  label,
  icon: Icon,
  error,
  children,
  hint,
}: {
  label: string;
  icon: typeof User;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#2e1a47]">
        {label}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#9b8fa8]" />
        {children}
      </div>
      {hint && !error && (
        <p className="mt-1.5 text-xs text-[#9b8fa8]">{hint}</p>
      )}
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-[#e8e0f0] bg-[#faf8fc] pl-11 pr-4 text-sm text-[#2e1a47] shadow-sm transition-colors placeholder:text-[#9b8fa8]/80 focus:border-[#e91e8c] focus:outline-none focus:ring-2 focus:ring-[#e91e8c]/20";

export function ContactForm({
  profile = null,
}: {
  profile?: {
    display_name: string | null;
    email: string;
    phone: string | null;
  } | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const subject = searchParams.get("subject");
  const profileParam = searchParams.get("profile");

  const defaultValues = useMemo<ContactFormData>(
    () => ({
      name: profile?.display_name?.trim() || "",
      email: profile?.email?.trim() || "",
      phone: profile?.phone?.trim() || "",
      message: buildDefaultMessage(subject, profileParam),
    }),
    [profile, subject, profileParam]
  );

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  async function onSubmit(data: ContactFormData) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Une erreur est survenue");
      }

      const canOpen = Boolean(result.canOpenInApp && result.chatId);

      toast({
        title: "Message envoyé",
        description: canOpen
          ? "Redirection vers votre conversation avec l'équipe."
          : "Notre équipe vous répondra par email ou téléphone si vous l'avez indiqué.",
      });
      reset(defaultValues);

      if (canOpen && typeof result.chatId === "string") {
        router.push(`/messages/${result.chatId}`);
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description:
          err instanceof Error ? err.message : "Impossible d'envoyer le message.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const title =
    subject === "signalement"
      ? "Signaler un profil"
      : subject === "acces-gratuit"
        ? "Demande d'accès gratuit"
        : "Écrire à un administrateur";

  const description =
    subject === "signalement"
      ? "Signalez un comportement ou un profil qui vous semble inapproprié. Notre équipe traitera votre demande en priorité."
      : subject === "acces-gratuit"
        ? "Expliquez votre situation : l'administration peut accorder un accès gratuit à l'inscription ou au matching."
        : "Contact gratuit pour visiteurs et membres. Notre équipe vous répondra dans les meilleurs délais.";

  return (
    <article className="mm-landing-panel mx-auto max-w-xl overflow-hidden">
      <div className="h-1.5 w-full bg-gradient-to-r from-[#7b3d8f] via-[#e91e8c] to-[#f9a8d4]" />

      <div className="border-b border-[#ebe6f0]/80 bg-gradient-to-br from-white via-white to-[#fce7f3]/20 px-6 py-6 sm:px-8">
        <div className="flex items-start gap-4">
          <div className="mm-landing-icon-pink h-12 w-12 shrink-0">
            <MessageSquare className="h-5 w-5 stroke-[1.75]" />
          </div>
          <div>
            <h2 className="font-sans text-xl font-bold text-[#2e1a47] sm:text-2xl">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#6b5f7a]">
              {description}
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5 bg-white px-6 py-6 sm:px-8 sm:py-8"
      >
        <ContactField label="Nom *" icon={User} error={errors.name?.message}>
          <input
            id="name"
            placeholder="Votre nom"
            className={inputClass}
            {...register("name")}
          />
        </ContactField>

        <ContactField label="Email" icon={Mail} error={errors.email?.message}>
          <input
            id="email"
            type="email"
            placeholder="votre@email.com"
            className={inputClass}
            {...register("email")}
          />
        </ContactField>

        <ContactField label="Téléphone" icon={Phone} error={errors.phone?.message}>
          <input
            id="phone"
            type="tel"
            placeholder="+33 6 00 00 00 00"
            className={inputClass}
            {...register("phone")}
          />
        </ContactField>

        <p className="rounded-xl bg-[#faf8fc] px-4 py-3 text-xs leading-relaxed text-[#6b5f7a]">
          Renseignez au moins un <strong className="text-[#2e1a47]">email</strong> ou un{" "}
          <strong className="text-[#2e1a47]">numéro de téléphone</strong> pour que
          nous puissions vous répondre.
        </p>

        <div>
          <label
            htmlFor="message"
            className="mb-2 block text-sm font-semibold text-[#2e1a47]"
          >
            Message *
          </label>
          <textarea
            id="message"
            placeholder="Comment pouvons-nous vous aider ?"
            rows={6}
            className={cn(
              inputClass,
              "min-h-[140px] resize-y py-3 pl-4 focus:pl-4"
            )}
            {...register("message")}
          />
          {errors.message && (
            <p className="mt-1.5 text-sm text-destructive">
              {errors.message.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full text-base font-semibold text-white shadow-lg transition-all disabled:opacity-60",
            "bg-gradient-to-r from-[#7b3d8f] to-[#e91e8c] shadow-[#e91e8c]/25 hover:brightness-105"
          )}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Envoi en cours…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Envoyer le message
            </>
          )}
        </button>
      </form>
    </article>
  );
}
