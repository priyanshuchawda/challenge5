import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function LandingHeader() {
  return (
    <>
      <a className="landing-skip-link" href="#main">
        Skip to main content
      </a>
      <header className="landing-header">
        <Link className="landing-brand" href="/">
          <span className="landing-brand-mark" aria-hidden="true">
            g
          </span>
          GatherWise
        </Link>
        <nav aria-label="Main navigation">
          <Link href="#how-it-works">How it works</Link>
          <Link className="landing-nav-cta" href="/planner">
            Open planner <ArrowRight size={15} />
          </Link>
        </nav>
      </header>
    </>
  );
}
