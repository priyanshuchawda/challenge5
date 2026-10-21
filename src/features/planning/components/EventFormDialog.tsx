import type { FormEvent } from "react";
import { Sparkles, X } from "lucide-react";
import { supportedCurrencies, type EventRequest } from "../schema";
import { useModalDialog } from "./useModalDialog";

export type NewEventForm = {
  name: string;
  type: EventRequest["type"];
  date: string;
  guests: string;
  budget: string;
  currency: EventRequest["currency"];
  location: string;
  priorities: string;
};

interface EventFormDialogProps {
  form: NewEventForm;
  error: string;
  onChange: (field: keyof NewEventForm, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function EventFormDialog({ form, error, onChange, onClose, onSubmit }: EventFormDialogProps) {
  const { dialogRef, handleKeyDown } = useModalDialog(onClose);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="event-modal" role="dialog" aria-modal="true" aria-labelledby="new-event-title" aria-describedby="new-event-description" onKeyDown={handleKeyDown}>
        <div className="modal-heading"><div><span className="panel-kicker">A NEW REASON TO GATHER</span><h2 id="new-event-title">Let’s make a plan</h2></div><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={19} /></button></div>
        <p id="new-event-description" className="modal-subtitle">Start with the basics. You can shape the details as you go.</p>
        <form onSubmit={onSubmit} className="event-form">
          <label>Event name<input required minLength={2} maxLength={80} placeholder="e.g. Sam’s 30th birthday" value={form.name} onChange={(event) => onChange("name", event.target.value)} /></label>
          <div className="form-row"><label>Celebration<select value={form.type} onChange={(event) => onChange("type", event.target.value)}><option>Wedding</option><option>Birthday</option><option>Community event</option></select></label><label>Event date<input required type="date" value={form.date} onChange={(event) => onChange("date", event.target.value)} /></label></div>
          <div className="form-row"><label>Guest estimate<input required type="number" min="1" max="5000" value={form.guests} onChange={(event) => onChange("guests", event.target.value)} /></label><label>Budget<input required aria-label={`Budget (${form.currency})`} type="number" min="1" step="1" value={form.budget} onChange={(event) => onChange("budget", event.target.value)} /></label></div>
          <label>Currency<select aria-label="Event currency" value={form.currency} onChange={(event) => onChange("currency", event.target.value)}>{supportedCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select><small>Budget and expenses are tracked in this currency.</small></label>
          <label>Location<input required minLength={2} maxLength={120} placeholder="City or venue" value={form.location} onChange={(event) => onChange("location", event.target.value)} /></label>
          <label>What matters most?<input maxLength={240} placeholder="Step-free access, dietary needs…" value={form.priorities} onChange={(event) => onChange("priorities", event.target.value)} /><small>Separate priorities with commas. Avoid guest names or contact details.</small></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="submit" className="primary-button"><Sparkles size={16} /> Create my plan</button></div>
        </form>
        <p className="privacy-note">Your event details stay in this browser. No account required.</p>
      </section>
    </div>
  );
}
