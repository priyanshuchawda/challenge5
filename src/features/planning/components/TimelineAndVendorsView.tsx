import { CalendarDays, Check, Store } from "lucide-react";
import { formatDate, formatMoney } from "../format";
import type { EventPlan, RunOfShowItem, Vendor } from "../schema";
import { RunOfShowSection } from "./RunOfShowSection";

interface TimelineAndVendorsViewProps {
  plan: EventPlan;
  completed: number;
  onToggleTask: (taskId: string) => void;
  onVendorStatusChange: (vendorId: string, status: Vendor["status"]) => void;
  onScheduleChange: (itemId: string, field: keyof Omit<RunOfShowItem, "id">, value: string) => void;
}

export function TimelineAndVendorsView({
  plan,
  completed,
  onToggleTask,
  onVendorStatusChange,
  onScheduleChange,
}: TimelineAndVendorsViewProps) {
  const bookedCount = plan.vendors.filter((vendor) => vendor.status === "Booked").length;
  return (
    <section className="detail-page">
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">FROM FIRST STEP TO EVENT DAY</span>
          <h2 className="panel-title">Timeline &amp; vendor checklist</h2>
        </div>
        <span className="detail-total">
          {completed}/{plan.tasks.length} tasks done
        </span>
      </div>
      <p className="detail-intro">
        Track the work and vendor conversations together. Deadlines and budget allocations are
        generated from your event details; bookings remain yours to confirm.
      </p>
      <RunOfShowSection
        eventName={plan.request.name}
        items={plan.runOfShow}
        onChange={onScheduleChange}
      />
      <div className="timeline-vendor-grid">
        <section className="workflow-section" aria-labelledby="timeline-title">
          <h4 id="timeline-title">
            <CalendarDays size={16} /> Planning timeline
          </h4>
          <div className="timeline-list">
            {plan.tasks.map((task) => (
              <label className={`timeline-task ${task.completed ? "task-done" : ""}`} key={task.id}>
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => onToggleTask(task.id)}
                  aria-label={`${task.completed ? "Mark incomplete" : "Complete"}: ${task.title}`}
                />
                <span className="timeline-marker">
                  <Check size={12} />
                </span>
                <span className="timeline-copy">
                  <strong>{task.title}</strong>
                  <small>
                    {task.category} · {task.priority} priority
                  </small>
                </span>
                <time dateTime={task.dueDate}>
                  {formatDate(task.dueDate, { day: "numeric", month: "short", year: "numeric" })}
                </time>
              </label>
            ))}
          </div>
        </section>
        <section className="workflow-section" aria-labelledby="vendor-title">
          <h4 id="vendor-title">
            <Store size={16} /> Vendor pipeline{" "}
            <span>
              {bookedCount}/{plan.vendors.length} booked
            </span>
          </h4>
          <div className="vendor-list">
            {plan.vendors.map((vendor) => (
              <article className="vendor-card" key={vendor.id}>
                <div className="vendor-card-heading">
                  <div>
                    <span className="panel-kicker">{vendor.category.toUpperCase()}</span>
                    <h5>{vendor.name}</h5>
                  </div>
                  <strong>{formatMoney(vendor.estimatedCost, plan.request.currency)}</strong>
                </div>
                <p>{vendor.notes}</p>
                <label className="vendor-status-label">
                  Status
                  <select
                    aria-label={`${vendor.category} vendor status`}
                    value={vendor.status}
                    onChange={(event) =>
                      onVendorStatusChange(vendor.id, event.target.value as Vendor["status"])
                    }
                  >
                    <option>Researching</option>
                    <option>Contacted</option>
                    <option>Quoted</option>
                    <option>Booked</option>
                  </select>
                </label>
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
