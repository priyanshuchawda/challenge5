import { Download, Printer } from "lucide-react";
import type { RunOfShowItem } from "../schema";
import { downloadRunOfShowCsv } from "../run-of-show-csv";

interface RunOfShowSectionProps {
  eventName: string;
  items: RunOfShowItem[];
  onChange: (itemId: string, field: keyof Omit<RunOfShowItem, "id">, value: string) => void;
}

export function RunOfShowSection({ eventName, items, onChange }: RunOfShowSectionProps) {
  return (
    <section className="run-of-show-section" aria-labelledby="run-of-show-title">
      <div className="panel-heading run-of-show-heading">
        <div>
          <span className="panel-kicker">THE EVENT DAY</span>
          <h3 id="run-of-show-title">Run of show</h3>
          <p className="schedule-caption">
            A starter schedule, editable for your event. Confirm final timings with your team.
          </p>
        </div>
        <div className="export-actions">
          <button className="secondary-button" onClick={() => window.print()}>
            <Printer size={14} /> Print plan
          </button>
          <button
            className="secondary-button"
            onClick={() => downloadRunOfShowCsv(eventName, items)}
          >
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>
      <div className="run-of-show-table-wrap">
        <table className="run-of-show-table">
          <caption className="sr-only">Editable event-day run of show</caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Activity</th>
              <th scope="col">Lead</th>
              <th scope="col">Location</th>
              <th scope="col">Notes</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <label className="sr-only" htmlFor={`${item.id}-time`}>
                    Time for {item.activity}
                  </label>
                  <input
                    id={`${item.id}-time`}
                    type="time"
                    value={item.time}
                    onChange={(event) => onChange(item.id, "time", event.target.value)}
                  />
                </td>
                <td>
                  <label className="sr-only" htmlFor={`${item.id}-activity`}>
                    Activity
                  </label>
                  <input
                    id={`${item.id}-activity`}
                    maxLength={120}
                    value={item.activity}
                    onChange={(event) => onChange(item.id, "activity", event.target.value)}
                  />
                </td>
                <td>
                  <label className="sr-only" htmlFor={`${item.id}-lead`}>
                    Lead
                  </label>
                  <input
                    id={`${item.id}-lead`}
                    maxLength={80}
                    value={item.lead}
                    onChange={(event) => onChange(item.id, "lead", event.target.value)}
                  />
                </td>
                <td>
                  <label className="sr-only" htmlFor={`${item.id}-location`}>
                    Location
                  </label>
                  <input
                    id={`${item.id}-location`}
                    maxLength={100}
                    value={item.location}
                    onChange={(event) => onChange(item.id, "location", event.target.value)}
                  />
                </td>
                <td>
                  <label className="sr-only" htmlFor={`${item.id}-notes`}>
                    Notes
                  </label>
                  <input
                    id={`${item.id}-notes`}
                    maxLength={240}
                    value={item.notes}
                    onChange={(event) => onChange(item.id, "notes", event.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
