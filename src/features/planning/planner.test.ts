import { describe, expect, it } from "vitest";
import { allocateBudget, budgetTotal, completedTaskCount, createPlan } from "./planner";
import { eventRequestSchema } from "./schema";

const request = eventRequestSchema.parse({
  name: "Maya's garden wedding",
  type: "Wedding",
  date: "2027-06-12",
  guests: 90,
  budget: 1200000,
  location: "Pune, India",
  priorities: ["vegetarian menu", "step-free access"],
});

describe("planning domain", () => {
  it("rejects impossible budgets and out-of-range guest counts", () => {
    expect(eventRequestSchema.safeParse({ ...request, budget: -1 }).success).toBe(false);
    expect(eventRequestSchema.safeParse({ ...request, guests: 0 }).success).toBe(false);
  });

  it("allocates the full integer budget without rounding loss", () => {
    expect(budgetTotal(allocateBudget(1_000_003))).toBe(1_000_003);
  });

  it("creates actionable tasks with deadlines before the event date", () => {
    const plan = createPlan(request, "test-event");
    expect(plan.tasks).toHaveLength(6);
    expect(plan.tasks.every((task) => task.dueDate < request.date)).toBe(true);
    expect(plan.tasks[0]?.title).toContain("accessibility");
  });

  it("counts task completion deterministically", () => {
    const plan = createPlan(request, "test-event");
    expect(completedTaskCount(plan.tasks.map((task, index) => ({ ...task, completed: index < 2 })))).toBe(2);
  });
});
