import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { formatMoney } from "../../format";
import type { EventPlan } from "../../schema";

interface EventStatsGridProps {
  plan: EventPlan;
  eventCount: number;
  completed: number;
}

export function EventStatsGrid({ plan, eventCount, completed }: EventStatsGridProps) {
  return (
    <section className="stats-grid" aria-label="Event summary">
      <article className="stat-card">
        <div className="stat-icon green">
          <CalendarDays size={17} />
        </div>
        <span className="stat-label">UPCOMING EVENTS</span>
        <strong className="stat-value">{eventCount.toString().padStart(2, "0")}</strong>
        <span className="stat-foot">
          <span className="trend up">
            <ArrowUpRight size={14} /> Active
          </span>{" "}
          in your workspace
        </span>
      </article>
      <article className="stat-card">
        <div className="stat-icon peach">
          <Check size={18} />
        </div>
        <span className="stat-label">TASKS COMPLETED</span>
        <strong className="stat-value">
          {completed}
          <small> / {plan.tasks.length}</small>
        </strong>
        <span className="stat-foot">
          <span className="trend up">
            <ArrowUpRight size={14} /> Keep going
          </span>{" "}
          you’re on track
        </span>
      </article>
      <article className="stat-card">
        <div className="stat-icon lilac">
          <WalletCards size={17} />
        </div>
        <span className="stat-label">PLANNED BUDGET</span>
        <strong className="stat-value stat-money">
          {formatMoney(plan.request.budget, plan.request.currency)}
        </strong>
        <span className="stat-foot">
          <span className="trend down">
            <ArrowDownRight size={14} /> 0%
          </span>{" "}
          spend tracked so far
        </span>
      </article>
      <article className="stat-card">
        <div className="stat-icon teal">
          <UsersRound size={17} />
        </div>
        <span className="stat-label">GUESTS INVITED</span>
        <strong className="stat-value">
          {plan.request.guests}
          <small> people</small>
        </strong>
        <span className="stat-foot">
          <span className="trend up">
            <ArrowUpRight size={14} /> Ready
          </span>{" "}
          guest list estimate
        </span>
      </article>
    </section>
  );
}
