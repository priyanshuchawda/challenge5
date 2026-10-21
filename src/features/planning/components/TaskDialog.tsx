import type { FormEvent } from "react";
import { ListTodo, X } from "lucide-react";
import type { TaskDraft } from "../schema";
import { useModalDialog } from "./useModalDialog";

interface TaskDialogProps {
  task: TaskDraft;
  onChange: (field: keyof TaskDraft, value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function TaskDialog({ task, onChange, onClose, onSubmit }: TaskDialogProps) {
  const { dialogRef, handleKeyDown } = useModalDialog(onClose);
  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="event-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-title"
        onKeyDown={handleKeyDown}
      >
        <div className="modal-heading">
          <div>
            <span className="panel-kicker">MAKE THE PLAN YOURS</span>
            <h2 id="task-title">Add a planning task</h2>
          </div>
          <button className="icon-button" aria-label="Close task dialog" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <p className="modal-subtitle">
          Add a concrete next step. You can mark it complete from the overview.
        </p>
        <form className="event-form" onSubmit={onSubmit}>
          <label>
            Task
            <input
              autoFocus
              required
              minLength={2}
              maxLength={160}
              value={task.title}
              onChange={(event) => onChange("title", event.target.value)}
              placeholder="e.g. Confirm quiet seating area"
            />
          </label>
          <div className="form-row">
            <label>
              Due date
              <input
                required
                type="date"
                value={task.dueDate}
                onChange={(event) => onChange("dueDate", event.target.value)}
              />
            </label>
            <label>
              Priority
              <select
                value={task.priority}
                onChange={(event) => onChange("priority", event.target.value)}
              >
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
          </div>
          <label>
            Category
            <input
              required
              minLength={2}
              maxLength={80}
              value={task.category}
              onChange={(event) => onChange("category", event.target.value)}
              placeholder="e.g. Accessibility"
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              <ListTodo size={15} /> Add task
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
