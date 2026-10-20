import { loadEnvConfig } from "@next/env";
import { describe, expect, it } from "vitest";
import { generateEventIdeas } from "./gemini";
import { eventIdeasSchema, type IdeaRequest } from "@/features/planning/schema";

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
      primaryModel: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite",
      fallbackConfigured: Boolean(process.env.GEMINI_FALLBACK_MODEL || "gemini-2.5-flash"),
      schemaValid: true,
      generatedSuggestions: ideas.suggestions.length,
      refinedSuggestions: refinedIdeas.suggestions.length,
    }));
  }, 45_000);
});
