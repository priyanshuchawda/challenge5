import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function LandingAICallout() {
  return (
    <section className="landing-ai" aria-labelledby="ai-title">
      <div className="landing-ai-icon">
        <Sparkles size={20} />
      </div>
      <div>
        <span className="landing-eyebrow">A HELPFUL ASSISTANT, NOT THE SOURCE OF TRUTH</span>
        <h2 id="ai-title">Good ideas. Grounded decisions.</h2>
        <p>
          AI suggestions are checked against application rules. Budgets, task status, and dates stay
          under your control. Prefer to skip AI? The planner still works.
        </p>
      </div>
      <Link href="/planner">
        Explore the planner <ArrowRight size={16} />
      </Link>
    </section>
  );
}
