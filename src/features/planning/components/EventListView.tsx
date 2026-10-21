import { Flower2, Plus } from "lucide-react";
import { formatDate, formatMoney } from "../format";
import type { EventPlan } from "../schema";

interface EventListViewProps {
  plans: EventPlan[];
  onCreate: () => void;
  onOpen: (planId: string) => void;
}

export function EventListView({ plans, onCreate, onOpen }: EventListViewProps) {
  return (
    <section className="detail-page">
      <div className="panel-heading"><div><span className="panel-kicker">YOUR CELEBRATIONS</span><h3>All your events</h3></div><button className="primary-button" onClick={onCreate}><Plus size={16} /> Plan an event</button></div>
      <div className="event-list">{plans.map((plan) => (
        <article className="event-list-card" key={plan.id}>
          <div className="event-list-icon"><Flower2 size={19} /></div>
          <div className="event-list-copy"><strong>{plan.request.name}</strong><span>{plan.request.type} · {formatDate(plan.request.date, { day: "numeric", month: "long", year: "numeric" })} · {plan.request.location}</span></div>
          <span className="event-list-budget">{formatMoney(plan.request.budget, plan.request.currency)}</span>
          <button className="secondary-button" onClick={() => onOpen(plan.id)}>Open event</button>
        </article>
      ))}</div>
    </section>
  );
}
