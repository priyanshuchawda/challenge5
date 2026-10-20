import type { BudgetAllocation, EventPlan, EventRequest, PlanTask } from "./schema";

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
  const daysUntilEvent = Math.max(1, Math.ceil((eventDay.getTime() - currentDay.getTime()) / 86_400_000));
  const deadline = (share: number) => dateOffset(request.date, Math.min(90, Math.max(1, Math.floor(daysUntilEvent * share))));
  const suggestions: Omit<PlanTask, "id" | "completed">[] = [
    { title: "Confirm venue and accessibility", dueDate: deadline(0.8), priority: "High", category: "Venue" },
    { title: "Build guest list and send invitations", dueDate: deadline(0.64), priority: "High", category: "Guests" },
    { title: isCommunity ? "Confirm permits and community partners" : "Book catering and confirm dietary needs", dueDate: deadline(0.48), priority: "High", category: "Food & drink" },
    { title: "Choose a theme and source decor", dueDate: deadline(0.32), priority: "Medium", category: "Design" },
    { title: isWedding ? "Confirm ceremony and reception run of show" : "Draft the event day schedule", dueDate: deadline(0.18), priority: "Medium", category: "Schedule" },
    { title: "Check final details with every vendor", dueDate: deadline(0.06), priority: "Low", category: "Vendors" },
  ];
  const tasks = suggestions.map((task, index) => ({ ...task, id: `${id}-${index + 1}`, completed: false }));
  return { id, request, tasks, budget: allocateBudget(request.budget), createdAt: new Date().toISOString() };
}

export function budgetTotal(allocations: BudgetAllocation[]): number {
  return allocations.reduce((total, item) => total + item.amount, 0);
}

export function completedTaskCount(tasks: PlanTask[]): number {
  return tasks.filter((task) => task.completed).length;
}
