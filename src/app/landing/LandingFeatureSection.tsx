import { CalendarCheck2, Sparkles, WalletCards } from "lucide-react";

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

export function LandingFeatureSection() {
  return (
    <>
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
    </>
  );
}
