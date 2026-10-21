import { CircleHelp, Plus, Sparkles } from "lucide-react";
import { formatDate, formatMoney } from "../format";
import type { EventPlan } from "../schema";

interface BudgetPlannerViewProps {
  plan: EventPlan;
  spent: number;
  remaining: number;
  onAddExpense: () => void;
}

export function BudgetPlannerView({
  plan,
  spent,
  remaining,
  onAddExpense,
}: BudgetPlannerViewProps) {
  return (
    <section className="panel detail-page">
      <div className="panel-heading">
        <div>
          <span className="panel-kicker">PLAN WITHIN YOUR LIMIT</span>
          <h2 className="panel-title">{plan.request.name} budget</h2>
        </div>
        <span className="detail-total">
          {formatMoney(plan.request.budget, plan.request.currency)}
        </span>
      </div>
      <p className="detail-intro">
        A starting allocation based on your total budget. These are planning estimates; confirm
        actual prices with vendors.
      </p>
      <div className={`budget-summary ${remaining < 0 ? "budget-over" : ""}`}>
        <div>
          <span>Total budget</span>
          <strong>{formatMoney(plan.request.budget, plan.request.currency)}</strong>
        </div>
        <div>
          <span>Recorded expenses</span>
          <strong>{formatMoney(spent, plan.request.currency)}</strong>
        </div>
        <div>
          <span>{remaining < 0 ? "Over budget" : "Remaining"}</span>
          <strong>{formatMoney(Math.abs(remaining), plan.request.currency)}</strong>
        </div>
      </div>
      {remaining < 0 && (
        <div className="budget-alert" role="alert">
          <CircleHelp size={15} />
          <span>
            Recorded spending is {formatMoney(Math.abs(remaining), plan.request.currency)} over this
            event’s total budget. Review the estimates before adding commitments.
          </span>
        </div>
      )}
      <div className="panel-heading expense-heading">
        <div>
          <span className="panel-kicker">ALLOCATIONS AND ACTUALS</span>
          <h3>Budget categories</h3>
        </div>
        <button className="primary-button" onClick={onAddExpense}>
          <Plus size={15} /> Add expense
        </button>
      </div>
      <div className="budget-detail-list">
        {plan.budget.map((item) => (
          <div className="budget-detail-row" key={item.category}>
            <span className="legend-dot" style={{ background: item.color }} />
            <strong>{item.category}</strong>
            <div className="budget-detail-track">
              <span
                style={{
                  width: `${Math.min(100, item.amount ? (item.spent / item.amount) * 100 : 0)}%`,
                  background: item.spent > item.amount ? "#b8544b" : item.color,
                }}
              />
            </div>
            <b>
              {formatMoney(item.spent, plan.request.currency)} /{" "}
              {formatMoney(item.amount, plan.request.currency)}
            </b>
            <small>{item.amount ? Math.round((item.spent / item.amount) * 100) : 0}%</small>
          </div>
        ))}
      </div>
      <div
        className="expense-table-wrap"
        tabIndex={0}
        aria-label="Recorded expenses table; scroll horizontally for all columns"
      >
        <table className="expense-table">
          <caption>Recorded expenses</caption>
          <thead>
            <tr>
              <th scope="col">Description</th>
              <th scope="col">Category</th>
              <th scope="col">Date</th>
              <th scope="col">Amount</th>
            </tr>
          </thead>
          <tbody>
            {plan.expenses.length ? (
              plan.expenses.map((expense) => (
                <tr key={expense.id}>
                  <td>{expense.description}</td>
                  <td>{expense.category}</td>
                  <td>
                    {formatDate(expense.date, { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td>{formatMoney(expense.amount, plan.request.currency)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>
                  No expenses yet. Add a receipt or deposit to track actual spending.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="budget-note">
        <Sparkles size={15} />
        <span>
          Keep your <strong>{plan.request.priorities.join(", ") || "event priorities"}</strong> in
          mind when adjusting these estimates.
        </span>
      </div>
    </section>
  );
}
