"use client";

import Link from "next/link";
import {
  Compass,
  Headphones,
  Heart,
  Layers,
  Sparkles,
  UserRound,
} from "lucide-react";

interface LikesAnalysisBannerProps {
  likesCount: number;
  profileCompletion: number;
}

/** Soft state : likes envoyés, dossier en analyse par l'équipe. */
export function LikesAnalysisBanner({
  likesCount,
  profileCompletion,
}: LikesAnalysisBannerProps) {
  if (likesCount <= 0) return null;

  const incomplete = profileCompletion < 80;

  return (
    <div className="mm-card overflow-hidden p-0">
      <div className="h-1 w-full bg-gradient-to-r from-[#7b3d8f] via-[#e91e8c] to-[#f9a8d4]" />
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex items-start gap-4">
          <div className="mm-landing-icon-pink h-12 w-12 shrink-0">
            <Sparkles className="h-5 w-5 stroke-[1.75]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#2e1a47]">
              {likesCount} like{likesCount > 1 ? "s" : ""} envoyé
              {likesCount > 1 ? "s" : ""} — l&apos;équipe analyse les
              compatibilités
            </p>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-[#6b5f7a]">
              Ce n&apos;est pas un chat libre : une mise en relation apparaît
              quand un administrateur valide une compatibilité. Aucun délai
              garanti — un profil complet accélère le process.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
          <Link
            href="/decouvrir"
            className="inline-flex items-center gap-2 rounded-full border border-[#d8cfe8] bg-white px-4 py-2 text-sm font-semibold text-[#2e1a47] shadow-sm hover:border-[#e91e8c]/40"
          >
            <Compass className="h-4 w-4" />
            Continuer à liker
          </Link>
          {incomplete && (
            <Link
              href="/profil/modifier"
              className="inline-flex items-center gap-2 rounded-full bg-[#fce7f3] px-4 py-2 text-sm font-semibold text-[#e91e8c] hover:bg-[#fce7f3]/80"
            >
              <UserRound className="h-4 w-4" />
              Compléter mon profil
            </Link>
          )}
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-[#d8cfe8] bg-white px-4 py-2 text-sm font-semibold text-[#2e1a47] shadow-sm hover:border-[#e91e8c]/40"
          >
            <Headphones className="h-4 w-4" />
            Contacter l&apos;équipe
          </Link>
        </div>
      </div>
    </div>
  );
}

export function LikesEmptyWithHints() {
  return (
    <div className="mm-card flex flex-col items-center px-6 py-14 text-center sm:px-10">
      <div className="mm-landing-icon-pink h-16 w-16">
        <Heart className="h-8 w-8 stroke-[1.75]" />
      </div>
      <p className="mt-5 font-sans text-xl font-bold text-[#2e1a47] sm:text-2xl">
        Aucun like pour le moment
      </p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[#6b5f7a]">
        Parcourez les profils et montrez votre intérêt — l&apos;équipe pourra
        ensuite analyser une mise en relation.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/decouvrir"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7b3d8f] to-[#e91e8c] px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#e91e8c]/25 hover:brightness-105"
        >
          <Compass className="h-4 w-4" />
          Découvrir des profils
        </Link>
        <Link
          href="/rencontres"
          className="inline-flex items-center gap-2 rounded-full border border-[#d8cfe8] bg-white px-6 py-2.5 text-sm font-semibold text-[#2e1a47] shadow-sm hover:border-[#e91e8c]/40"
        >
          <Layers className="h-4 w-4" />
          Suggestions du jour
        </Link>
      </div>
    </div>
  );
}
