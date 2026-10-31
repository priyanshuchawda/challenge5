import { Check, Clock3, Plus, Sparkles } from "lucide-react";
import { formatDate, formatMoney } from "../../format";
import type { EventPlan } from "../../schema";

interface OverviewPlanningPanelsProps {
  plan: EventPlan;
  onToggleTask: (taskId: string) => void;
  onNavigate: (view: "My events" | "Budget planner") => void;
  onAddTask: () => void;
}

export function OverviewPlanningPanels({
  plan,
  onToggleTask,
  onNavigate,
  onAddTask,
}: OverviewPlanningPanelsProps) {
  return (
    <>
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
