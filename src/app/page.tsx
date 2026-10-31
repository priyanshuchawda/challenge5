import "./landing.css";
import { LandingAICallout } from "./landing/LandingAICallout";
import { LandingFeatureSection } from "./landing/LandingFeatureSection";
import { LandingFooter } from "./landing/LandingFooter";
import { LandingHeader } from "./landing/LandingHeader";
import { LandingHero } from "./landing/LandingHero";

export default function HomePage() {
  return (
    <div className="landing">
      <LandingHeader />
      <main className="landing-main" id="main">
        <LandingHero />
        <LandingFeatureSection />
        <LandingAICallout />
      </main>
      <LandingFooter />
    </div>
  );
}
