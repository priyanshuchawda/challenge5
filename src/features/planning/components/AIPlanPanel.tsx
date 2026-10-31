"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { type EventPlan, type FullPlanResponse } from "../schema";
import { requestFullPlan } from "../ai-client";
import { AIPlanProposal } from "./AIPlanProposal";

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
      const payload = {
        ...eventContext(plan, language),
        ...(refine && result ? { feedback: feedback.trim(), previousPlan: result } : {}),
      };
      const response = await requestFullPlan(payload);
      setResult(response.plan);
      setMessage(refine ? "Updated AI plan is ready to review." : "AI plan is ready to review.");
      if (refine) setFeedback("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "AI planning is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel detail-page" aria-labelledby="ai-plan-title" aria-busy={pending}>
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">PERSONALIZED PLANNING</span>
          <h2 className="panel-title" id="ai-plan-title">
            Build a complete plan with AI
          </h2>
        </div>
        <Sparkles size={20} aria-hidden="true" />
      </div>
      <p className="detail-intro">
        Get tailored budget allocations, dated tasks, vendor questions, and ideas. Review the
        proposal before applying it to this event.
      </p>
      <div className="form-field">
        <label htmlFor="ai-plan-language">Plan language</label>
        <select
          id="ai-plan-language"
          value={language}
          onChange={(event) => onLanguageChange(event.target.value)}
        >
          <option>English</option>
          <option>Hindi</option>
          <option>Tamil</option>
          <option>Bengali</option>
          <option>Spanish</option>
          <option>French</option>
        </select>
        <small>
          Generated content follows this language; workspace controls remain in English.
        </small>
      </div>
      <div className="topbar-actions">
        <button
          className="primary-button"
          onClick={() => void requestPlan(false)}
          disabled={pending}
        >
          <Sparkles size={15} />
          {pending ? "Planning…" : result ? "Generate a new plan" : "Generate my full plan"}
        </button>
      </div>
      {pending && (
        <p role="status">{result ? "Updating your plan…" : "Generating a tailored plan…"}</p>
      )}
      {result && (
        <AIPlanProposal
          result={result}
          currency={plan.request.currency}
          feedback={feedback}
          pending={pending}
          onFeedbackChange={setFeedback}
          onApply={() => {
            onApply(result);
            setMessage("AI plan applied. Completed tasks and recorded expenses were preserved.");
          }}
          onRefine={() => void requestPlan(true)}
        />
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="budget-alert" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
