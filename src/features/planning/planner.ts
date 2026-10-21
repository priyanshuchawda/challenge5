import {
  expenseSchema,
  runOfShowItemSchema,
  taskDraftSchema,
  vendorSchema,
  type BudgetAllocation,
  type EventPlan,
  type EventRequest,
  type Expense,
  type PlanTask,
  type RunOfShowItem,
  type TaskDraft,
  type Vendor,
} from "./schema";

const budgetTemplate = [
  { category: "Venue", share: 0.28, color: "#728a67" },
  { category: "Food & drink", share: 0.3, color: "#d59a65" },
  { category: "Decor & flowers", share: 0.14, color: "#cf8291" },
  { category: "Photography", share: 0.12, color: "#8e83bd" },
  { category: "Music & fun", share: 0.09, color: "#6b9c9b" },
  { category: "Contingency", share: 0.07, color: "#d2c5aa" },
] as const;

export function allocateBudget(limit: number): BudgetAllocation[] {
  const allocations = budgetTemplate.map(({ category, share, color }) => ({
    category,
    amount: Math.floor(limit * share),
    color,
    spent: 0,
  }));
  const remainder = limit - allocations.reduce((sum, item) => sum + item.amount, 0);
  const contingency = allocations.find((item) => item.category === "Contingency");
  if (contingency) contingency.amount += remainder;
  return allocations;
}

function dateOffset(date: string, days: number): string {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

export function createPlan(request: EventRequest, id = crypto.randomUUID()): EventPlan {
  const isWedding = request.type === "Wedding";
  const isCommunity = request.type === "Community event";
  const eventDay = new Date(`${request.date}T12:00:00.000Z`);
  const currentDay = new Date();
  currentDay.setUTCHours(12, 0, 0, 0);
  const daysUntilEvent = Math.max(
    1,
    Math.ceil((eventDay.getTime() - currentDay.getTime()) / 86_400_000),
  );
  const deadline = (share: number) =>
    dateOffset(request.date, Math.min(90, Math.max(1, Math.floor(daysUntilEvent * share))));
  const suggestions: Omit<PlanTask, "id" | "completed">[] = [
    {
      title: "Confirm venue and accessibility",
      dueDate: deadline(0.8),
      priority: "High",
      category: "Venue",
    },
    {
      title: "Build guest list and send invitations",
      dueDate: deadline(0.64),
      priority: "High",
      category: "Guests",
    },
    {
      title: isCommunity
        ? "Confirm permits and community partners"
        : "Book catering and confirm dietary needs",
      dueDate: deadline(0.48),
      priority: "High",
      category: "Food & drink",
    },
    {
      title: "Choose a theme and source decor",
      dueDate: deadline(0.32),
      priority: "Medium",
      category: "Design",
    },
    {
      title: isWedding
        ? "Confirm ceremony and reception run of show"
        : "Draft the event day schedule",
      dueDate: deadline(0.18),
      priority: "Medium",
      category: "Schedule",
    },
    {
      title: "Check final details with every vendor",
      dueDate: deadline(0.06),
      priority: "Low",
      category: "Vendors",
    },
  ];
  const tasks = suggestions.map((task, index) => ({
    ...task,
    id: `${id}-${index + 1}`,
    completed: false,
  }));
  const budget = allocateBudget(request.budget);
  const vendors: Vendor[] = [
    {
      id: `${id}-vendor-venue`,
      name: "Venue shortlist",
      category: "Venue",
      status: "Researching",
      estimatedCost: budget.find((item) => item.category === "Venue")?.amount ?? 0,
      notes: "Confirm date, accessibility, capacity, and cancellation terms.",
    },
    {
      id: `${id}-vendor-food`,
      name: "Catering shortlist",
      category: "Food & drink",
      status: "Researching",
      estimatedCost: budget.find((item) => item.category === "Food & drink")?.amount ?? 0,
      notes: "Confirm dietary requirements, service style, and taxes.",
    },
    {
      id: `${id}-vendor-photo`,
      name: "Photography shortlist",
      category: "Photography",
      status: "Researching",
      estimatedCost: budget.find((item) => item.category === "Photography")?.amount ?? 0,
      notes: "Review portfolio, hours, deliverables, and usage rights.",
    },
  ];
  const runOfShow: RunOfShowItem[] = [
    {
      id: `${id}-ros-1`,
      time: "09:00",
      activity: "Venue access and setup check",
      lead: "Event host",
      location: request.location,
      notes: "Confirm accessible routes, restrooms, seating, and vendor arrival points.",
    },
    {
      id: `${id}-ros-2`,
      time: "10:00",
      activity: "Vendor arrival and sound check",
      lead: "Day-of coordinator",
      location: request.location,
      notes: "Check deliveries against the agreed schedule and contact list.",
    },
    {
      id: `${id}-ros-3`,
      time: "11:00",
      activity: "Guest welcome and arrivals",
      lead: "Welcome team",
      location: request.location,
      notes: "Keep the entrance clear and direct guests to seating and amenities.",
    },
    {
      id: `${id}-ros-4`,
      time: "12:00",
      activity: "Meal service and dietary check",
      lead: "Catering lead",
      location: request.location,
      notes: `Confirm the ${request.guests} guest estimate and agreed dietary arrangements.`,
    },
    {
      id: `${id}-ros-5`,
      time: "14:00",
      activity: "Main celebration and shared moment",
      lead: "Event host",
      location: request.location,
      notes: "Leave a short buffer between activities and announce any changes clearly.",
    },
    {
      id: `${id}-ros-6`,
      time: "16:00",
      activity: "Closing, guest departure, and pack-down",
      lead: "Day-of coordinator",
      location: request.location,
      notes: "Check lost property, vendor pickup, and venue handover requirements.",
    },
  ];
  return {
    id,
    request,
    tasks,
    budget,
    expenses: [] as Expense[],
    vendors,
    runOfShow,
    createdAt: new Date().toISOString(),
  };
}

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
