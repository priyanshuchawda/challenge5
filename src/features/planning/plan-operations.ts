import { expenseSchema, runOfShowItemSchema, taskDraftSchema, vendorSchema } from "./schema";
import type {
  BudgetAllocation,
  EventPlan,
  Expense,
  PlanTask,
  RunOfShowItem,
  TaskDraft,
  Vendor,
} from "./schema";

export function budgetTotal(allocations: BudgetAllocation[]): number {
  return allocations.reduce((total, item) => total + item.amount, 0);
}

export function completedTaskCount(tasks: PlanTask[]): number {
  return tasks.filter((task) => task.completed).length;
}

export function addTask(plan: EventPlan, input: TaskDraft, id = crypto.randomUUID()): EventPlan {
  const task = taskDraftSchema.parse(input);
  return { ...plan, tasks: [{ ...task, id, completed: false }, ...plan.tasks] };
}

export function totalSpent(expenses: Expense[]): number {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

export function remainingBudget(limit: number, expenses: Expense[]): number {
  return limit - totalSpent(expenses);
}

function reconcileExpenses(budget: BudgetAllocation[], expenses: Expense[]): BudgetAllocation[] {
  const spentByCategory = new Map<string, number>();
  for (const expense of expenses) {
    spentByCategory.set(
      expense.category,
      (spentByCategory.get(expense.category) ?? 0) + expense.amount,
    );
  }
  return budget.map((item) => ({ ...item, spent: spentByCategory.get(item.category) ?? 0 }));
}

export function addExpense(
  plan: EventPlan,
  input: Omit<Expense, "id">,
  id = crypto.randomUUID(),
): EventPlan {
  const expense = expenseSchema.parse({ ...input, id });
  if (!plan.budget.some((item) => item.category === expense.category))
    throw new Error("Choose a valid budget category.");
  const expenses = [...plan.expenses, expense];
  return { ...plan, expenses, budget: reconcileExpenses(plan.budget, expenses) };
}

export function updateVendor(
  plan: EventPlan,
  vendorId: string,
  update: Partial<Omit<Vendor, "id">>,
): EventPlan {
  const index = plan.vendors.findIndex((vendor) => vendor.id === vendorId);
  if (index < 0) throw new Error("Vendor was not found.");
  const vendors = [...plan.vendors];
  vendors[index] = vendorSchema.parse({ ...vendors[index], ...update });
  return { ...plan, vendors };
}

export function updateRunOfShowItem(
  plan: EventPlan,
  itemId: string,
  update: Partial<Omit<RunOfShowItem, "id">>,
): EventPlan {
  const index = plan.runOfShow.findIndex((item) => item.id === itemId);
  if (index < 0) throw new Error("Schedule item was not found.");
  const runOfShow = [...plan.runOfShow];
  runOfShow[index] = runOfShowItemSchema.parse({ ...runOfShow[index], ...update });
  runOfShow.sort((a, b) => a.time.localeCompare(b.time));
  return { ...plan, runOfShow };
}
