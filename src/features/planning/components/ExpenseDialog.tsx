import type { FormEvent } from "react";
import { ReceiptText, X } from "lucide-react";
import type { EventPlan } from "../schema";
import { useModalDialog } from "./useModalDialog";

interface ExpenseDialogProps {
  plan: EventPlan;
  category: string;
  description: string;
  amount: string;
  onCategoryChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function ExpenseDialog({
  plan,
  category,
  description,
  amount,
  onCategoryChange,
  onDescriptionChange,
  onAmountChange,
  onClose,
  onSubmit,
}: ExpenseDialogProps) {
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
        className="event-modal expense-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="expense-title"
        onKeyDown={handleKeyDown}
      >
        <div className="modal-heading">
          <div>
            <span className="panel-kicker">KEEP THE NUMBERS HONEST</span>
            <h2 id="expense-title">Record an expense</h2>
          </div>
          <button className="icon-button" aria-label="Close expense dialog" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <p className="modal-subtitle">
          Amounts are stored as whole {plan.request.currency} values and reconciled locally against
          this event budget.
        </p>
        <form className="event-form" onSubmit={onSubmit}>
          <label>
            Description
            <input
              required
              minLength={2}
              maxLength={120}
              value={description}
              onChange={(event) => onDescriptionChange(event.target.value)}
              placeholder="e.g. Venue deposit"
            />
          </label>
          <label>
            Budget category
            <select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
              {plan.budget.map((item) => (
                <option key={item.category}>{item.category}</option>
              ))}
            </select>
          </label>
          <label>
            Amount ({plan.request.currency})
            <input
              required
              type="number"
              min="1"
              max="1000000000"
              step="1"
              value={amount}
              onChange={(event) => onAmountChange(event.target.value)}
              placeholder="25000"
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              <ReceiptText size={15} /> Save expense
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
