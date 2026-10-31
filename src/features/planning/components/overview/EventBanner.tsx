import { CalendarDays, MapPin } from "lucide-react";
import type { CSSProperties } from "react";
import type { EventPlan } from "../../schema";

interface EventBannerProps {
  plan: EventPlan;
  daysUntil: number;
  readyPercent: number;
  formattedEventDate: string;
  onViewEvents: () => void;
}

export function EventBanner({
  plan,
  daysUntil,
  readyPercent,
  formattedEventDate,
  onViewEvents,
}: EventBannerProps) {
  return (
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
          style={{ "--progress": `${readyPercent}%` } as CSSProperties}
        >
          <div>
            <strong>{readyPercent}%</strong>
            <small>ready</small>
          </div>
        </div>
        <button className="text-button" onClick={onViewEvents}>
          <span>View event</span>
          <span aria-hidden="true">↗</span>
        </button>
      </div>
    </section>
  );
}
