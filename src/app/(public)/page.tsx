import type { Metadata } from "next";
import {
  HeroSection,
  SocialProofSection,
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
    <div className="pb-24 sm:pb-0">
      <HeroSection />
      <SocialProofSection />
      <WhySection />
      <StepsSection />
      <PricingTeaserSection />
      <TrustSection />
      <RegisterSection />
      <LandingStickyCta />
    </div>
  );
}
