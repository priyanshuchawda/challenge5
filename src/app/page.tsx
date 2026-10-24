import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck2,
  Check,
  ClipboardList,
  Sparkles,
  WalletCards,
} from "lucide-react";
import "./landing.css";

const features = [
  {
    icon: WalletCards,
    title: "A budget that adds up",
    detail: "See practical category estimates, record actual costs, and spot overspending early.",
  },
  {
    icon: CalendarCheck2,
    title: "Clear next steps",
    detail:
      "Turn the date into a timeline and keep tasks, vendors, and the event-day schedule together.",
  },
  {
    icon: Sparkles,
    title: "AI with guardrails",
    detail:
      "Gemini can suggest and refine ideas. GatherWise validates the plan and calculates the totals.",
  },
];

export default function HomePage() {
  return (
    <div className="landing">
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

      <main className="landing-main" id="main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-copy">
            <span className="landing-eyebrow">
              <span /> A calmer way to bring people together
            </span>
            <h1 id="landing-title">Make room for the moments that matter.</h1>
            <p className="landing-lede">
              Plan a wedding, birthday, or community gathering with a budget you can trust, a
              timeline you can follow, and thoughtful help when you need it.
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

          <section className="landing-preview" aria-labelledby="preview-title">
            <div className="preview-topline">
              <span>YOUR CELEBRATION</span>
              <span className="preview-status">IN GOOD HANDS</span>
            </div>
            <h2 className="preview-title" id="preview-title">
              Sample plan · Maya’s garden wedding
            </h2>
            <div className="preview-meta">
              Pune, India <span /> 96 guests <span /> 12 Dec 2026
            </div>
            <div className="preview-budget">
              <div>
                <span>Budget overview</span>
                <strong>₹18,00,000</strong>
              </div>
              <div className="preview-bar" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="preview-legend">
                <span>Venue</span>
                <span>Food</span>
                <span>Design</span>
                <span>Photo</span>
              </div>
            </div>
            <div className="preview-tasks-title">
              <span>UP NEXT</span>
              <span>2 of 6 complete</span>
            </div>
            <div className="preview-task">
              <span className="preview-check">
                <Check size={12} />
              </span>
              <span>
                <b>Confirm step-free venue access</b>
                <small>Venue · High priority</small>
              </span>
              <time>OCT 28</time>
            </div>
            <div className="preview-task">
              <span className="preview-empty-check" />
              <span>
                <b>Confirm menu and dietary needs</b>
                <small>Food &amp; drink · High priority</small>
              </span>
              <time>NOV 03</time>
            </div>
            <div className="preview-note">
              <Sparkles size={15} />
              <span>
                <b>AI suggestions stay editable.</b> You decide what becomes part of the plan.
              </span>
            </div>
            <div className="preview-decor preview-flower" aria-hidden="true">
              ✿
            </div>
            <div className="preview-decor preview-leaf" aria-hidden="true">
              ✳
            </div>
          </section>
        </section>

        <section className="landing-proof" aria-label="What GatherWise helps you coordinate">
          <span>ONE THOUGHTFUL WORKSPACE</span>
          <strong>Budget</strong>
          <i /> <strong>Timeline</strong>
          <i /> <strong>Vendors</strong>
          <i /> <strong>Event-day plan</strong>
        </section>

        <section className="landing-how" id="how-it-works" aria-labelledby="how-title">
          <div className="landing-section-heading">
            <span className="landing-eyebrow">FROM FIRST IDEA TO EVENT DAY</span>
            <h2 id="how-title">Everything in its place. Nothing set in stone.</h2>
            <p>Useful structure to get you started, with room to make every decision your own.</p>
          </div>
          <div className="landing-feature-grid">
            {features.map(({ icon: Icon, title, detail }, index) => (
              <article className="landing-feature" key={title}>
                <div className="landing-feature-icon">
                  <Icon size={20} />
                </div>
                <span className="landing-feature-number">0{index + 1}</span>
                <h3>{title}</h3>
                <p>{detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-ai" aria-labelledby="ai-title">
          <div className="landing-ai-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <span className="landing-eyebrow">A HELPFUL ASSISTANT, NOT THE SOURCE OF TRUTH</span>
            <h2 id="ai-title">Good ideas. Grounded decisions.</h2>
            <p>
              AI suggestions are checked against application rules. Budgets, task status, and dates
              stay under your control. Prefer to skip AI? The planner still works.
            </p>
          </div>
          <Link href="/planner">
            Explore the planner <ArrowRight size={16} />
          </Link>
        </section>
      </main>

      <footer className="landing-footer">
        <Link className="landing-brand" href="/">
          GatherWise
        </Link>
        <span>Plan with care. Celebrate together.</span>
        <Link href="/planner">
          <ClipboardList size={15} /> Open your workspace
        </Link>
      </footer>
    </div>
  );
}
