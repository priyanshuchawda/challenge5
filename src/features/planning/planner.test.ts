import { describe, expect, it } from "vitest";
import {
  addExpense,
  addTask,
  allocateBudget,
  budgetTotal,
  completedTaskCount,
  createPlan,
  remainingBudget,
  totalSpent,
  updateRunOfShowItem,
  updateVendor,
} from "./planner";
import { eventRequestSchema, type BudgetAllocation } from "./schema";

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

  it("uses event-specific category weights and keeps the reserve explicit", () => {
    const wedding = allocateBudget(100_001, "Wedding");
    const birthday = allocateBudget(100_001, "Birthday");
    const community = allocateBudget(100_001, "Community event");
    const amount = (rows: BudgetAllocation[], category: string) =>
      rows.find((row) => row.category === category)?.amount;

    expect(budgetTotal(wedding)).toBe(100_001);
    expect(budgetTotal(birthday)).toBe(100_001);
    expect(budgetTotal(community)).toBe(100_001);
    expect(amount(wedding, "Contingency")).toBe(7_000);
    expect(amount(birthday, "Contingency")).toBe(15_000);
    expect(amount(community, "Contingency")).toBe(27_000);
    expect(amount(community, "Photography")).toBeLessThan(amount(wedding, "Photography") ?? 0);
  });

  it("allocates a larger share to a matching priority", () => {
    const ordinary = allocateBudget(1_000_000, "Wedding");
    const prioritized = allocateBudget(1_000_000, "Wedding", ["Vegetarian menu"]);
    const amount = (rows: BudgetAllocation[], category: string) =>
      rows.find((row) => row.category === category)?.amount ?? 0;

    expect(amount(prioritized, "Food & drink")).toBeGreaterThan(amount(ordinary, "Food & drink"));
    expect(amount(prioritized, "Venue")).toBeLessThan(amount(ordinary, "Venue"));
  });

  it("rejects unsafe budget values before allocation", () => {
    for (const invalid of [0, -1, 1.25, Number.MAX_SAFE_INTEGER + 1, 1_000_000_001]) {
      expect(() => allocateBudget(invalid)).toThrow(RangeError);
    }
  });

  it("creates actionable tasks with deadlines before the event date", () => {
    const plan = createPlan(request, "test-event");
    expect(plan.tasks).toHaveLength(6);
    expect(plan.tasks.every((task) => task.dueDate < request.date)).toBe(true);
    expect(plan.tasks[0]?.title).toContain("accessibility");
  });

  it("bounds deadlines to today for near events and preserves past event dates", () => {
    const nearEvent = eventRequestSchema.parse({ ...request, date: "2026-10-28" });
    const upcoming = createPlan(nearEvent, "near-event", "2026-10-24");
    expect(upcoming.tasks.every((task) => task.dueDate >= "2026-10-24")).toBe(true);
    expect(upcoming.tasks.every((task) => task.dueDate <= nearEvent.date)).toBe(true);

    const pastEvent = eventRequestSchema.parse({ ...request, date: "2026-10-20" });
    const historical = createPlan(pastEvent, "past-event", "2026-10-24");
    expect(historical.tasks.every((task) => task.dueDate === pastEvent.date)).toBe(true);
  });

  it("counts task completion deterministically", () => {
    const plan = createPlan(request, "test-event");
    expect(
      completedTaskCount(plan.tasks.map((task, index) => ({ ...task, completed: index < 2 }))),
    ).toBe(2);
  });

  it("adds validated custom tasks without mutating the saved plan", () => {
    const plan = createPlan(request, "custom-task-event");
    const updated = addTask(
      plan,
      {
        title: "Confirm quiet room",
        dueDate: "2027-06-10",
        priority: "High",
        category: "Accessibility",
      },
      "custom-task-1",
    );
    expect(updated.tasks[0]).toEqual({
      id: "custom-task-1",
      title: "Confirm quiet room",
      dueDate: "2027-06-10",
      priority: "High",
      category: "Accessibility",
      completed: false,
    });
    expect(plan.tasks).toHaveLength(6);
    expect(() =>
      addTask(plan, { title: "x", dueDate: "not-a-date", priority: "High", category: "Access" }),
    ).toThrow();
  });

  it("tracks actual expenses with integer totals and detects overspend", () => {
    const plan = createPlan(request, "expense-event");
    const category = plan.budget[0]?.category ?? "Venue";
    const updated = addExpense(
      plan,
      { category, description: "Venue deposit", amount: 250_001, date: "2026-10-20" },
      "expense-1",
    );
    expect(updated.budget[0]?.spent).toBe(250_001);
    expect(totalSpent(updated.expenses)).toBe(250_001);
    expect(remainingBudget(1200000, updated.expenses)).toBe(949_999);
    expect(remainingBudget(200000, updated.expenses)).toBeLessThan(0);
    const overspent = addExpense(
      updated,
      { category, description: "Final venue payment", amount: 1_100_000, date: "2026-10-20" },
      "expense-2",
    );
    expect(remainingBudget(1200000, overspent.expenses)).toBeLessThan(0);
    expect(overspent.budget[0]?.spent).toBe(1_350_001);
    expect(plan.expenses).toHaveLength(0);
  });

  it("rejects invalid expense categories and updates vendor workflow statuses", () => {
    const plan = createPlan(request, "vendor-event");
    expect(() =>
      addExpense(plan, {
        category: "Unknown",
        description: "Deposit",
        amount: 500,
        date: "2026-10-20",
      }),
    ).toThrow("valid budget category");
    const venue = plan.vendors[0];
    if (!venue) throw new Error("Expected the default venue checklist item.");
    const updated = updateVendor(plan, venue.id, { status: "Booked", estimatedCost: 300_000 });
    expect(updated.vendors[0]).toMatchObject({ status: "Booked", estimatedCost: 300_000 });
  });

  it("creates an ordered day-of schedule and validates schedule edits", () => {
    const plan = createPlan(request, "schedule-event");
    expect(plan.runOfShow.length).toBeGreaterThanOrEqual(5);
    expect(plan.runOfShow.map((item) => item.time)).toEqual(
      [...plan.runOfShow.map((item) => item.time)].sort(),
    );
    const first = plan.runOfShow[0];
    if (!first) throw new Error("Expected a starter schedule.");
    const updated = updateRunOfShowItem(plan, first.id, { time: "08:30", lead: "Coordinator" });
    expect(updated.runOfShow[0]).toMatchObject({ time: "08:30", lead: "Coordinator" });
    expect(() => updateRunOfShowItem(plan, first.id, { time: "25:00" })).toThrow();
  });
});
