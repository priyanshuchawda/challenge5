import { Sparkles } from "lucide-react";
import { formatDate, formatMoney } from "../format";
import type { Currency, FullPlanResponse } from "../schema";

type AIPlan = FullPlanResponse["plan"];

interface AIPlanProposalProps {
  result: AIPlan;
  currency: Currency;
  feedback: string;
  pending: boolean;
  onFeedbackChange: (value: string) => void;
  onApply: () => void;
  onRefine: () => void;
}

export function AIPlanProposal({
  result,
  currency,
  feedback,
  pending,
  onFeedbackChange,
  onApply,
  onRefine,
}: AIPlanProposalProps) {
  return (
    <>
      <div className="bottom-note">
        <div className="note-spark">
          <Sparkles size={16} />
        </div>
        <p>
          <strong>AI planning summary</strong>
          <span>{result.summary}</span>
        </p>
      </div>
      <div className="lower-grid">
        <section className="workflow-section" aria-labelledby="proposal-budget-title">
          <h3 id="proposal-budget-title">Proposed budget</h3>
          <ul>
            {result.budget.map((item) => (
              <li key={item.category}>
                {item.category}: <strong>{formatMoney(item.amount, currency)}</strong>
                {item.tip && <span> — {item.tip}</span>}
              </li>
            ))}
          </ul>
        </section>
        <section className="workflow-section" aria-labelledby="proposal-tasks-title">
          <h3 id="proposal-tasks-title">Planning timeline</h3>
          <ul>
            {result.timeline.slice(0, 8).map((task, index) => (
              <li key={`${task.title}-${index}`}>
                <strong>{task.title}</strong> · {formatDate(task.dueDate)} · {task.priority}
              </li>
            ))}
          </ul>
        </section>
      </div>
      {result.vendors.length > 0 && (
        <section className="workflow-section" aria-labelledby="proposal-vendors-title">
          <h3 id="proposal-vendors-title">Vendor research prompts</h3>
          <ul>
            {result.vendors.map((vendor, index) => (
              <li key={`${vendor.category}-${index}`}>
                <strong>{vendor.category}:</strong> {vendor.lookFor}
                {vendor.questions.length > 0 && ` — Ask: ${vendor.questions.join("; ")}`}
              </li>
            ))}
          </ul>
        </section>
      )}
      {result.ideas.length > 0 && (
        <section className="workflow-section" aria-labelledby="proposal-ideas-title">
          <h3 id="proposal-ideas-title">Personalized ideas</h3>
          <ul>
            {result.ideas.map((idea, index) => (
              <li key={`${idea.area}-${index}`}>
                <strong>{idea.title}</strong> ({idea.area}) — {idea.description}{" "}
                <span>{idea.whyItFits}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <button className="primary-button" onClick={onApply} disabled={pending}>
        Apply this plan
      </button>
      <div className="form-field">
        <label htmlFor="ai-plan-feedback">Refine this plan</label>
        <textarea
          id="ai-plan-feedback"
          rows={3}
          maxLength={500}
          value={feedback}
          onChange={(event) => onFeedbackChange(event.target.value)}
          placeholder="For example: reduce decor spending and keep step-free access a priority"
        />
        <small>{feedback.length}/500</small>
      </div>
      <button
        className="quiet-button"
        onClick={onRefine}
        disabled={pending || feedback.trim().length < 3}
      >
        {pending ? "Updating…" : "Refine AI plan"}
      </button>
    </>
  );
}
