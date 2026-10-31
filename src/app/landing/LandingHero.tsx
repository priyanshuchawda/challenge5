import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { LandingPreview } from "./LandingPreview";

export function LandingHero() {
  return (
    <section className="landing-hero" aria-labelledby="landing-title">
      <div className="landing-copy">
        <span className="landing-eyebrow">
          <span /> A calmer way to bring people together
        </span>
        <h1 id="landing-title">Make room for the moments that matter.</h1>
        <p className="landing-lede">
          Plan a wedding, birthday, or community gathering with a budget you can trust, a timeline
          you can follow, and thoughtful help when you need it.
        </p>
        <div className="landing-actions">
          <Link className="landing-primary" href="/planner">
            Start planning <ArrowRight size={17} />
          </Link>
          <a className="landing-secondary" href="#how-it-works">
            See how it works
          </a>
        </div>
        <ul className="landing-trust-list">
          <li>
            <Check size={15} /> No account needed
          </li>
          <li>
            <Check size={15} /> Works without AI
          </li>
          <li>
            <Check size={15} /> Saved in your browser
          </li>
        </ul>
      </div>
      <LandingPreview />
    </section>
  );
}
