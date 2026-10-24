import { describe, expect, it } from "vitest";
import { addExpense, createPlan } from "./planner";
import { applyAIPlan } from "./apply-ai-plan";
import { eventRequestSchema, type FullPlanResponse } from "./schema";

const request = eventRequestSchema.parse({
  name: "Test celebration",
  type: "Birthday",
  date: "2027-06-12",
  guests: 40,
  budget: 100_003,
  location: "Pune",
  priorities: ["Step-free access"],
});

const proposal: FullPlanResponse["plan"] = {
  summary: "A practical celebration plan with thoughtful access and clear spending priorities.",
  budget: [
    {
      category: "Venue",
      amount: 40_001,
      spent: 0,
      tip: "Confirm the step-free route and backup space.",
      color: "#728a67",
    },
    {
      category: "Food",
      amount: 35_001,
      spent: 0,
      tip: "Confirm dietary needs and label dishes clearly.",
      color: "#d59a65",
    },
    {
      category: "Activities",
      amount: 25_001,
      spent: 0,
      tip: "Choose activities guests can join comfortably.",
      color: "#cf8291",
    },
  ],
  timeline: Array.from({ length: 5 }, (_, index) => ({
    title: index === 0 ? "Confirm venue and accessibility" : `Planning task ${index + 1}`,
    dueDate: "2027-05-01",
    priority: "Medium",
    category: "Planning",
  })),
  vendors: [
    {
      category: "Venue",
      lookFor: "A step-free venue with a quiet area and indoor backup space.",
      questions: ["Is the entrance step-free?", "What is the cancellation policy?"],
      dueDate: "2027-05-01",
    },
    {
      category: "Food",
      lookFor: "A caterer who can label ingredients and confirm dietary requirements.",
      questions: ["Can you label all dishes?", "When is the final guest count due?"],
      dueDate: "2027-05-01",
    },
  ],
  ideas: Array.from({ length: 3 }, (_, index) => ({
    area: "Accessibility",
    title: `Thoughtful idea ${index + 1}`,
    description: "Offer a welcoming option that guests can choose at their own pace.",
    whyItFits: "This supports the access priority and makes participation comfortable.",
  })),
};

describe("applyAIPlan", () => {
  it("allocates the exact event budget and preserves completed work and recorded spending", () => {
    const initial = createPlan(request, "event-1");
    const withExpense = addExpense(
      initial,
      {
        category: "Venue",
        description: "Accessibility deposit",
        amount: 5_000,
        date: "2027-05-01",
      },
      "expense-1",
    );
    const current = {
      ...withExpense,
      tasks: withExpense.tasks.map((task, index) => ({
        ...task,
        completed: index === 0 || index === 5,
      })),
      vendors: withExpense.vendors.map((vendor) =>
        vendor.category === "Venue" ? { ...vendor, status: "Booked" as const } : vendor,
      ),
    };

    const result = applyAIPlan(current, proposal);

    expect(result.budget.reduce((sum, item) => sum + item.amount, 0)).toBe(request.budget);
    expect(result.expenses).toEqual(current.expenses);
    expect(result.budget.find((item) => item.category === "Venue")?.spent).toBe(5_000);
    expect(result.tasks.find((task) => task.id === "event-1-1")?.completed).toBe(true);
    expect(result.tasks.find((task) => task.id === "event-1-6")?.completed).toBe(true);
    expect(result.vendors.find((vendor) => vendor.category === "Venue")?.status).toBe("Booked");
    expect(result.runOfShow).toEqual(current.runOfShow);
  });

  it("rejects a proposal that does not satisfy the plan contract", () => {
    const current = createPlan(request, "event-1");

    expect(() => applyAIPlan(current, { ...proposal, summary: "short" })).toThrow();
  });

  it("keeps totals safe when proposed amounts are zero and vendor categories are new", () => {
    const current = createPlan(request, "event-2");
    const zeroBudgetProposal: FullPlanResponse["plan"] = {
      ...proposal,
      budget: proposal.budget.map((item) => ({ ...item, amount: 0 })),
      vendors: [
        ...proposal.vendors,
        {
          category: "Coordinator",
          lookFor: "A coordinator who can keep the schedule accessible and on time.",
          questions: ["How many events do you coordinate?", "Can you support access needs?"],
          dueDate: "2027-05-01",
        },
      ],
    };

    const result = applyAIPlan(current, zeroBudgetProposal);

    expect(result.budget.reduce((sum, item) => sum + item.amount, 0)).toBe(request.budget);
    expect(result.vendors.at(-1)).toMatchObject({
      category: "Coordinator",
      status: "Researching",
      estimatedCost: 0,
    });
  });
});
