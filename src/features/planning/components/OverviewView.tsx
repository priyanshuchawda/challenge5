import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  Clock3,
  MapPin,
  Plus,
  Sparkles,
  UsersRound,
  WalletCards,
} from "lucide-react";
import { formatDate, formatMoney } from "../format";
import type { EventPlan } from "../schema";

interface OverviewViewProps {
  plan: EventPlan;
  eventCount: number;
  completed: number;
  daysUntil: number;
  formattedEventDate: string;
  onToggleTask: (taskId: string) => void;
  onNavigate: (view: "My events" | "Budget planner") => void;
  onAddTask: () => void;
}

export function OverviewView({
  plan,
  eventCount,
  completed,
  daysUntil,
  formattedEventDate,
  onToggleTask,
  onNavigate,
  onAddTask,
}: OverviewViewProps) {
  const readyPercent = plan.tasks.length ? Math.round((completed / plan.tasks.length) * 100) : 0;
  return (
    <>
      <section className="event-banner" aria-label="Selected upcoming event">
        <div className="banner-photo" role="img" aria-label="Soft garden greenery and flowers">
          <div className="photo-shade" />
          <span className="photo-tag">
            <span className="live-dot" /> UP NEXT
          </span>
        </div>
        <div className="banner-main">
          <div className="banner-topline">
            <span className="event-type">{plan.request.type}</span>
          </div>
          <h2>{plan.request.name}</h2>
          <div className="event-meta">
            <span>
              <CalendarDays size={15} />
              {formattedEventDate}
            </span>
            <span>
              <MapPin size={15} />
              {plan.request.location}
            </span>
          </div>
          <div className="banner-bottom">
            <div className="guest-pile" aria-label={`${plan.request.guests} guests`}>
              <span>M</span>
              <span>A</span>
              <span>R</span>
              <span className="guest-more">+{Math.max(0, plan.request.guests - 3)}</span>
              <small>
                <strong>{plan.request.guests}</strong> guests
              </small>
            </div>
            <div className="countdown">
              <span>{daysUntil}</span>
              <small>days to go</small>
            </div>
          </div>
        </div>
        <div className="banner-side">
          <span className="side-label">YOUR PROGRESS</span>
          <div
            className="progress-ring"
            style={{ "--progress": `${readyPercent}%` } as React.CSSProperties}
          >
            <div>
              <strong>{readyPercent}%</strong>
              <small>ready</small>
            </div>
          </div>
          <button className="text-button" onClick={() => onNavigate("My events")}>
            <span>View event</span>
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </section>

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

      <section className="lower-grid">
        <article className="panel tasks-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">MAKE IT HAPPEN</span>
              <h3>Your next steps</h3>
            </div>
            <button className="quiet-button" onClick={() => onNavigate("My events")}>
              <span>See all</span>
              <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className="task-list">
            {plan.tasks.slice(0, 4).map((task) => (
              <label className={`task-row ${task.completed ? "task-done" : ""}`} key={task.id}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => onToggleTask(task.id)}
                  aria-label={`${task.completed ? "Mark incomplete" : "Complete"}: ${task.title}`}
                />
                <span className="custom-check">
                  <Check size={13} />
                </span>
                <span className="task-copy">
                  <strong>{task.title}</strong>
                  <small>{task.category}</small>
                </span>
                <span className="task-date">
                  <Clock3 size={13} />
                  {formatDate(task.dueDate)}
                </span>
                <span className={`priority priority-${task.priority.toLowerCase()}`}>
                  {task.priority}
                </span>
              </label>
            ))}
          </div>
          <button className="add-task" onClick={onAddTask}>
            <Plus size={15} /> Add a task
          </button>
        </article>
        <article className="panel budget-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">SPEND WITH INTENTION</span>
              <h3>Budget overview</h3>
            </div>
            <button className="quiet-button" onClick={() => onNavigate("Budget planner")}>
              <span>Details</span>
              <span aria-hidden="true">↗</span>
            </button>
          </div>
          <div className="budget-total">
            <strong>{formatMoney(plan.request.budget, plan.request.currency)}</strong>
            <span>total planned</span>
          </div>
          <div className="budget-bar" aria-label="Budget allocation breakdown">
            {plan.budget.map((item) => (
              <span
                key={item.category}
                style={{
                  width: `${(item.amount / plan.request.budget) * 100}%`,
                  background: item.color,
                }}
                title={`${item.category}: ${formatMoney(item.amount, plan.request.currency)}`}
              />
            ))}
          </div>
          <div className="budget-legend">
            {plan.budget.slice(0, 4).map((item) => (
              <div key={item.category}>
                <span className="legend-dot" style={{ background: item.color }} />
                <span>{item.category}</span>
                <strong>{formatMoney(item.amount, plan.request.currency)}</strong>
              </div>
            ))}
          </div>
          <div className="budget-note">
            <Sparkles size={15} />
            <span>
              Set aside{" "}
              <strong>
                {formatMoney(
                  plan.budget.find((item) => item.category === "Contingency")?.amount ?? 0,
                  plan.request.currency,
                )}
              </strong>{" "}
              for the unexpected.
            </span>
          </div>
        </article>
      </section>
      <section className="bottom-note">
        <div className="note-spark">
          <Sparkles size={16} />
        </div>
        <p>
          <strong>A thoughtful touch</strong>
          <span>
            {plan.request.priorities.length
              ? `Keep ${plan.request.priorities.join(" and ").toLowerCase()} in view as your plan takes shape.`
              : "Add a few priorities to make every suggestion more personal."}
          </span>
        </p>
      </section>
    </>
  );
}
