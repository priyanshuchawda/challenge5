import { Flower2, Lightbulb, Sparkles, UsersRound } from "lucide-react";
import type { EventIdeas, EventPlan } from "../schema";

interface InspirationViewProps {
  plan: EventPlan;
  ideas: EventIdeas | null;
  isLoading: boolean;
  error: string;
  onAskGemini: () => void;
}

export function InspirationView({ plan, ideas, isLoading, error, onAskGemini }: InspirationViewProps) {
  return (
    <section className="detail-page">
      <div className="panel-heading"><div><span className="panel-kicker">SMALL DETAILS, BIG FEELING</span><h2 className="panel-title">Ideas for your {plan.request.type.toLowerCase()}</h2></div><button className="primary-button" onClick={onAskGemini} disabled={isLoading}><Sparkles size={15} /> {isLoading ? "Thinking…" : "Ask Gemini"}</button></div>
      <p className="detail-intro">A few starting points shaped around {plan.request.guests} guests in {plan.request.location}. Use what fits and leave what doesn’t.</p>
      <p className="ai-privacy">Choosing Ask Gemini sends the event type, date, guest estimate, budget, location, and priorities to Google. Don’t include personal or sensitive details in your priorities. On the free API tier, prompts may be used to improve Google products. <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">Review Google’s terms</a>.</p>
      {error && <div className="notice" role="alert"><span>{error}</span></div>}
      {ideas && <section className="ai-result" aria-live="polite"><span className="panel-kicker">GEMINI IDEA SET</span><h3>{ideas.theme}</h3><p className="ai-overview">{ideas.overview}</p><div className="ideas-grid">{ideas.suggestions.map((idea) => <article className="idea-card" key={`${idea.category}-${idea.title}`}><span className="panel-kicker">{idea.category.toUpperCase()}{idea.budgetFriendly ? " · BUDGET CONSCIOUS" : ""}</span><h4>{idea.title}</h4><p>{idea.detail}</p></article>)}</div><div className="budget-note"><Sparkles size={15} /><span><strong>Contingency idea:</strong> {ideas.contingency} · Suggestions are estimates, not verified bookings or vendor prices.</span></div></section>}
      <div className="ideas-grid">
        <article className="idea-card"><span className="idea-icon idea-green"><Flower2 size={18} /></span><span className="panel-kicker">A WARM WELCOME</span><h3>Make arrival feel easy</h3><p>Set aside a clearly marked welcome area with seating, water, and a simple way to find the event space.</p></article>
        <article className="idea-card"><span className="idea-icon idea-peach"><UsersRound size={18} /></span><span className="panel-kicker">THOUGHTFUL HOSTING</span><h3>Plan for different needs</h3><p>{plan.request.priorities.length ? `Keep ${plan.request.priorities.join(" and ").toLowerCase()} visible in vendor conversations and the day-of checklist.` : "Ask guests about access and dietary needs early, then include confirmed arrangements in the run of show."}</p></article>
        <article className="idea-card"><span className="idea-icon idea-lilac"><Lightbulb size={18} /></span><span className="panel-kicker">A MOMENT TO REMEMBER</span><h3>Give the gathering a ritual</h3><p>Invite guests to share a short story, add a note to a memory table, or help choose a song for one shared moment.</p></article>
      </div>
      <p className="idea-disclaimer">These are general planning prompts, not vendor recommendations or verified availability.</p>
    </section>
  );
}
