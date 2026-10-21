"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { fullPlanResponseSchema, type EventPlan, type FullPlanResponse, type PlanTask, type Vendor } from "../schema";
import { formatDate, formatMoney } from "../format";

type AIPlan = FullPlanResponse["plan"];

interface AIPlanPanelProps {
  plan: EventPlan;
  language: string;
  onLanguageChange: (language: string) => void;
  onApply: (plan: AIPlan) => void;
}

function eventContext(plan: EventPlan, language: string) {
  return {
    eventType: plan.request.type,
    eventDate: plan.request.date,
    location: plan.request.location,
    guestCount: plan.request.guests,
    budget: plan.request.budget,
    currency: plan.request.currency,
    vibe: "",
    priorities: plan.request.priorities.join(", "),
    language,
  };
}

export function AIPlanPanel({ plan, language, onLanguageChange, onApply }: AIPlanPanelProps) {
  const [result, setResult] = useState<AIPlan | null>(null);
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function requestPlan(refine: boolean) {
    setPending(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...eventContext(plan, language),
          ...(refine && result ? { feedback: feedback.trim(), previousPlan: result } : {}),
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const detail = body && typeof body === "object" && "error" in body && typeof body.error === "string"
          ? body.error : "AI planning is temporarily unavailable.";
        throw new Error(detail);
      }
      const parsed = fullPlanResponseSchema.safeParse(body);
      if (!parsed.success) throw new Error("The AI response was incomplete. Your saved plan is unchanged.");
      setResult(parsed.data.plan);
      setMessage(refine ? "Updated AI plan is ready to review." : "AI plan is ready to review.");
      if (refine) setFeedback("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "AI planning is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  return <section className="panel detail-page" aria-labelledby="ai-plan-title" aria-busy={pending}>
    <div className="panel-heading"><div><span className="panel-kicker">PERSONALIZED PLANNING</span><h2 className="panel-title" id="ai-plan-title">Build a complete plan with AI</h2></div><Sparkles size={20} aria-hidden="true" /></div>
    <p className="detail-intro">Get tailored budget allocations, dated tasks, vendor questions, and ideas. Review the proposal before applying it to this event.</p>
    <div className="form-field"><label htmlFor="ai-plan-language">Plan language</label><select id="ai-plan-language" value={language} onChange={(event) => onLanguageChange(event.target.value)}><option>English</option><option>Hindi</option><option>Tamil</option><option>Bengali</option><option>Spanish</option><option>French</option></select><small>Generated content follows this language; workspace controls remain in English.</small></div>
    <div className="topbar-actions">
      <button className="primary-button" onClick={() => void requestPlan(false)} disabled={pending}>
        <Sparkles size={15} />{pending ? "Planning…" : result ? "Generate a new plan" : "Generate my full plan"}
      </button>
    </div>
    {pending && <p role="status">{result ? "Updating your plan…" : "Generating a tailored plan…"}</p>}
    {result && <>
      <div className="bottom-note"><div className="note-spark"><Sparkles size={16} /></div><p><strong>AI planning summary</strong><span>{result.summary}</span></p></div>
      <div className="lower-grid">
        <section className="workflow-section" aria-labelledby="proposal-budget-title">
          <h3 id="proposal-budget-title">Proposed budget</h3>
          <ul>{result.budget.map((item) => <li key={item.category}>{item.category}: <strong>{formatMoney(item.amount, plan.request.currency)}</strong>{item.tip && <span> — {item.tip}</span>}</li>)}</ul>
        </section>
        <section className="workflow-section" aria-labelledby="proposal-tasks-title">
          <h3 id="proposal-tasks-title">Planning timeline</h3>
          <ul>{result.timeline.slice(0, 8).map((task, index) => <li key={`${task.title}-${index}`}><strong>{task.title}</strong> · {formatDate(task.dueDate)} · {task.priority}</li>)}</ul>
        </section>
      </div>
      {result.vendors.length > 0 && <section className="workflow-section" aria-labelledby="proposal-vendors-title"><h3 id="proposal-vendors-title">Vendor research prompts</h3><ul>{result.vendors.map((vendor, index) => <li key={`${vendor.category}-${index}`}><strong>{vendor.category}:</strong> {vendor.lookFor}{vendor.questions.length > 0 && ` — Ask: ${vendor.questions.join("; ")}`}</li>)}</ul></section>}
      {result.ideas.length > 0 && <section className="workflow-section" aria-labelledby="proposal-ideas-title"><h3 id="proposal-ideas-title">Personalized ideas</h3><ul>{result.ideas.map((idea, index) => <li key={`${idea.area}-${index}`}><strong>{idea.title}</strong> ({idea.area}) — {idea.description} <span>{idea.whyItFits}</span></li>)}</ul></section>}
      <button className="primary-button" onClick={() => { onApply(result); setMessage("AI plan applied. Completed tasks and recorded expenses were preserved."); }} disabled={pending}>Apply this plan</button>
      <div className="form-field"><label htmlFor="ai-plan-feedback">Refine this plan</label><textarea id="ai-plan-feedback" rows={3} maxLength={500} value={feedback} onChange={(event) => setFeedback(event.target.value)} placeholder="For example: reduce decor spending and keep step-free access a priority" /><small>{feedback.length}/500</small></div>
      <button className="quiet-button" onClick={() => void requestPlan(true)} disabled={pending || feedback.trim().length < 3}>{pending ? "Updating…" : "Refine AI plan"}</button>
    </>}
    {message && <p className="notice" role="status">{message}</p>}
    {error && <p className="budget-alert" role="alert">{error}</p>}
  </section>;
}

export function mergeAIPlan(current: EventPlan, proposal: AIPlan): EventPlan {
  const proposedTotal = proposal.budget.reduce((sum, item) => sum + item.amount, 0);
  const allocations = proposal.budget.map((item, index) => {
    const existing = current.budget.find((entry) => entry.category.toLocaleLowerCase() === item.category.toLocaleLowerCase());
    const scaled = proposedTotal > 0 ? Math.floor(item.amount * current.request.budget / proposedTotal) : index === 0 ? current.request.budget : 0;
    return { category: item.category, amount: scaled, color: item.color ?? existing?.color ?? "#728a67", spent: 0 };
  });
  const allocated = allocations.reduce((sum, item) => sum + item.amount, 0);
  if (allocations[0]) allocations[0].amount += current.request.budget - allocated;

  const spentByCategory = new Map<string, number>();
  for (const expense of current.expenses) spentByCategory.set(expense.category.toLocaleLowerCase(), (spentByCategory.get(expense.category.toLocaleLowerCase()) ?? 0) + expense.amount);
  for (const allocation of allocations) allocation.spent = spentByCategory.get(allocation.category.toLocaleLowerCase()) ?? 0;

  const oldByTitle = new Map(current.tasks.map((task) => [task.title.trim().toLocaleLowerCase(), task]));
  const nextTasks: PlanTask[] = proposal.timeline.map((task, index) => {
    const prior = oldByTitle.get(task.title.trim().toLocaleLowerCase());
    return { ...task, id: prior?.id ?? `${current.id}-ai-${index}-${crypto.randomUUID()}`, completed: prior?.completed ?? false };
  });
  const retainedCompleted = current.tasks.filter((task) => task.completed && !nextTasks.some((candidate) => candidate.id === task.id));
  const vendors: Vendor[] = proposal.vendors.map((vendor, index) => {
    const prior = current.vendors.find((item) => item.category.toLocaleLowerCase() === vendor.category.toLocaleLowerCase());
    return {
      id: prior?.id ?? `${current.id}-ai-vendor-${index}-${crypto.randomUUID()}`,
      name: vendor.lookFor,
      category: vendor.category,
      status: prior?.status ?? "Researching",
      estimatedCost: allocations.find((item) => item.category.toLocaleLowerCase() === vendor.category.toLocaleLowerCase())?.amount ?? 0,
      notes: vendor.questions.join(" · ").slice(0, 300),
    };
  });
  return { ...current, tasks: [...retainedCompleted, ...nextTasks], budget: allocations, vendors };
}
