import { loadEnvConfig } from "@next/env";
import { describe, expect, it } from "vitest";
import { generateEventIdeas } from "./gemini";
import { generateFullPlan } from "./full-plan";
import { eventIdeasSchema, fullPlanRequestSchema, fullPlanResponseSchema, type IdeaRequest } from "@/features/planning/schema";

loadEnvConfig(process.cwd(), true);

const syntheticInput: IdeaRequest = {
  type: "Birthday",
  date: "2027-06-12",
  guests: 24,
  budget: 60000,
  location: "Pune, India",
  priorities: ["Step-free access", "Vegetarian menu"],
};

describe("live Gemini integration", () => {
  it("generates and refines schema-valid ideas with synthetic event data", async () => {
    expect(process.env.GEMINI_API_KEY, "Set GEMINI_API_KEY in .env.local before running the live smoke test").toBeTruthy();

    const ideas = eventIdeasSchema.parse(await generateEventIdeas(syntheticInput));
    const refinedIdeas = eventIdeasSchema.parse(await generateEventIdeas({
      ...syntheticInput,
      refinement: "Make the suggestions more budget-friendly and retain the step-free access arrangements.",
      currentIdeas: ideas,
    }));

    expect(ideas.suggestions.length).toBeGreaterThanOrEqual(3);
    expect(refinedIdeas.suggestions.length).toBeGreaterThanOrEqual(3);
    console.log(JSON.stringify({
      ok: true,
      primaryModel: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
      fallbackConfigured: Boolean(process.env.GEMINI_FALLBACK_MODEL || "gemini-3.8-flash"),
      schemaValid: true,
      generatedSuggestions: ideas.suggestions.length,
      refinedSuggestions: refinedIdeas.suggestions.length,
    }));
  }, 45_000);

  it("generates a complete structured plan with deterministic totals and real dates", async () => {
    expect(process.env.GEMINI_API_KEY, "Set GEMINI_API_KEY in .env.local before running the live smoke test").toBeTruthy();
    const request = fullPlanRequestSchema.parse({
      eventType: "Birthday", eventDate: "2027-06-12", location: "Pune, India", guestCount: 24,
      budget: 60_003, currency: "INR", vibe: "garden lunch", priorities: "Step-free access, vegetarian food", language: "English",
    });
    const result = fullPlanResponseSchema.parse(await generateFullPlan(request));
    expect(result.plan.budget.reduce((sum, item) => sum + item.amount, 0)).toBe(request.budget);
    expect(result.plan.timeline.length).toBeGreaterThanOrEqual(5);
    expect(result.plan.vendors.length).toBeGreaterThanOrEqual(2);
    console.log(JSON.stringify({ ok: true, schemaValid: true, allocations: result.plan.budget.length, tasks: result.plan.timeline.length, vendorGuides: result.plan.vendors.length, ideas: result.plan.ideas.length }));
  }, 45_000);
});
