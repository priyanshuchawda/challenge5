import {
  fullPlanRefinementRequestSchema,
  fullPlanRequestSchema,
  ideaRefinementRequestSchema,
  ideaRequestSchema,
} from "@/features/planning/schema";

function hasField(value: unknown, first: string, second: string): boolean {
  return typeof value === "object" && value !== null && (first in value || second in value);
}

export function parseIdeasRequest(value: unknown) {
  return hasField(value, "refinement", "currentIdeas")
    ? ideaRefinementRequestSchema.safeParse(value)
    : ideaRequestSchema.safeParse(value);
}

export function parseFullPlanRequest(value: unknown) {
  return hasField(value, "feedback", "previousPlan")
    ? fullPlanRefinementRequestSchema.safeParse(value)
    : fullPlanRequestSchema.safeParse(value);
}
