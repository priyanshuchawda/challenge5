import { describe, expect, it } from "vitest";
import { fullPlanDraftSchema, materializeFullPlan } from "./full-plan";
import { fullPlanRequestSchema } from "./schema";

const request = fullPlanRequestSchema.parse({
  eventType: "Birthday", eventDate: "2027-06-12", location: "Pune", guestCount: 24,
  budget: 100_003, currency: "INR", vibe: "garden", priorities: "Step-free access", language: "English",
});
const draft = fullPlanDraftSchema.parse({
  summary: "A relaxed, accessible garden celebration with a clear schedule and practical spending limits.",
  budget: [
    { category: "Venue", weight: 3, rationale: "Prioritize step-free access and a weather-safe backup." },
    { category: "Food", weight: 2, rationale: "Provide clearly labelled options and confirm dietary needs." },
    { category: "Activities", weight: 1, rationale: "Choose inclusive activities that suit a mixed-age group." },
  ],
  timeline: Array.from({ length: 5 }, (_, index) => ({ title: `Planning milestone ${index + 1}`, weeksBefore: index * 2, priority: "Medium", category: "Planning" })),
  vendors: [
    { category: "Venue", lookFor: "A step-free venue with a quiet area and indoor backup space.", questions: ["Is the entrance step-free?", "What is the cancellation policy?"], weeksBefore: 8 },
    { category: "Catering", lookFor: "A caterer who can label ingredients and confirm dietary requirements.", questions: ["Can you label all dishes?", "When is the final guest count due?"], weeksBefore: 6 },
  ],
  ideas: Array.from({ length: 3 }, (_, index) => ({ area: "Accessibility", title: `Thoughtful idea ${index + 1}`, description: "Offer a simple, welcoming option that guests can choose at their own pace.", whyItFits: "This directly supports the access priority and keeps participation comfortable." })),
});

describe("materializeFullPlan", () => {
  it("allocates every integer budget unit exactly and resolves week offsets to dates", () => {
    const plan = materializeFullPlan(request, draft, "2027-01-01");
    expect(plan.budget.reduce((sum, row) => sum + row.amount, 0)).toBe(request.budget);
    expect(plan.budget.map((row) => row.amount)).toEqual([50_002, 33_334, 16_667]);
    expect(plan.timeline.map((item) => item.dueDate)).toEqual(["2027-06-12", "2027-05-29", "2027-05-15", "2027-05-01", "2027-04-17"]);
    expect(plan.vendors[0]?.dueDate).toBe("2027-04-17");
  });

  it("moves overdue upcoming milestones to today and keeps past-event dates historical", () => {
    const nearEvent = fullPlanRequestSchema.parse({ ...request, eventDate: "2027-01-20" });
    expect(materializeFullPlan(nearEvent, draft, "2027-01-10").timeline[4]?.dueDate).toBe("2027-01-10");
    const pastEvent = fullPlanRequestSchema.parse({ ...request, eventDate: "2026-12-01" });
    expect(materializeFullPlan(pastEvent, draft, "2027-01-10").timeline[0]?.dueDate).toBe("2026-12-01");
  });

  it("rejects duplicate budget categories before calculating the allocation", () => {
    const duplicate = { ...draft, budget: [...draft.budget, { ...draft.budget[0]!, category: "venue" }] };
    expect(fullPlanDraftSchema.safeParse(duplicate).success).toBe(false);
  });
});
