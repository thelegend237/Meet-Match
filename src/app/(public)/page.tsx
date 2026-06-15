import type { Metadata } from "next";
import { LandingHeroSection } from "@/components/public/landing-hero";
import {
  WhySection,
  StepsSection,
  PricingTeaserSection,
  TrustSection,
  RegisterSection,
  LandingStickyCta,
} from "@/components/public/sections";

export const metadata: Metadata = {
  title: "Meet & Match — Rencontres sérieuses accompagnées",
  description:
    "Créez votre profil, likez des personnes compatibles et recevez des matchs proposés par une équipe d'administrateurs. Sans chat libre entre inconnus.",
};

export default function HomePage() {
  return (
    <div className="mm-landing-page pb-24 sm:pb-0">
      <LandingHeroSection />
      <WhySection variant="landing" />
      <StepsSection variant="landing" />
      <PricingTeaserSection variant="landing" />
      <TrustSection variant="landing" />
      <RegisterSection variant="landing" />
      <LandingStickyCta variant="landing" />
    </div>
  );
}
