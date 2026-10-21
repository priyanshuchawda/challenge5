import { z } from "zod";
import { fullPlanResponseSchema, type FullPlanRequest, type FullPlanResponse } from "./schema";

export const fullPlanDraftSchema = z.object({
  summary: z.string().trim().min(30).max(700),
  budget: z.array(z.object({
    category: z.string().trim().min(2).max(60),
    weight: z.number().int().min(1).max(10_000),
    rationale: z.string().trim().min(12).max(240),
  })).min(3).max(8),
  timeline: z.array(z.object({
    title: z.string().trim().min(3).max(120),
    weeksBefore: z.number().int().min(0).max(52),
    priority: z.enum(["High", "Medium", "Low"]),
    category: z.string().trim().min(2).max(60),
  })).min(5).max(18),
  vendors: z.array(z.object({
    category: z.string().trim().min(2).max(60),
    lookFor: z.string().trim().min(15).max(240),
    questions: z.array(z.string().trim().min(8).max(180)).min(2).max(5),
    weeksBefore: z.number().int().min(0).max(52),
  })).min(2).max(8),
  ideas: z.array(z.object({
    area: z.string().trim().min(2).max(40),
    title: z.string().trim().min(3).max(80),
    description: z.string().trim().min(20).max(280),
    whyItFits: z.string().trim().min(20).max(240),
  })).min(3).max(6),
}).superRefine((draft, context) => {
  const categories = draft.budget.map((item) => item.category.toLocaleLowerCase());
  if (new Set(categories).size !== categories.length) {
    context.addIssue({ code: "custom", path: ["budget"], message: "Budget categories must be unique." });
  }
});

type FullPlanDraft = z.infer<typeof fullPlanDraftSchema>;

const COLORS = ["#728a67", "#d59a65", "#cf8291", "#8e83bd", "#6b9c9b", "#d2c5aa", "#7796b0", "#b2775d"] as const;
function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function allocateExactBudget(limit: number, categories: FullPlanDraft["budget"]): FullPlanResponse["plan"]["budget"] {
  const totalWeight = categories.reduce((sum, category) => sum + category.weight, 0);
  const rows = categories.map((category, index) => {
    const exact = (limit * category.weight) / totalWeight;
    const amount = Math.floor(exact);
    return { category, index, amount, remainder: exact - amount };
  });
  let remaining = limit - rows.reduce((sum, row) => sum + row.amount, 0);
  const byRemainder = [...rows].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let index = 0; remaining > 0; index = (index + 1) % byRemainder.length) {
    const row = byRemainder[index];
    if (!row) break;
    row.amount += 1;
    remaining -= 1;
  }
  return rows.map(({ category, index, amount }) => ({
    category: category.category,
    amount,
    percent: Number(((category.weight / totalWeight) * 100).toFixed(1)),
    tip: category.rationale,
    color: COLORS[index % COLORS.length] ?? COLORS[0],
    spent: 0,
  }));
}

function resolveRelativeDate(eventDate: string, weeksBefore: number, today: string): string {
  const proposed = addDays(eventDate, -weeksBefore * 7);
  // For upcoming events, overdue milestones become due today. Past events retain
  // their historical event date instead of creating dates after the celebration.
  return eventDate >= today ? (proposed < today ? today : proposed) : eventDate;
}

/** Turns model suggestions into deterministic money and calendar dates. */
export function materializeFullPlan(request: FullPlanRequest, draftInput: FullPlanDraft, today = new Date().toISOString().slice(0, 10)): FullPlanResponse["plan"] {
  const draft = fullPlanDraftSchema.parse(draftInput);
  const response = {
    summary: draft.summary,
    budget: allocateExactBudget(request.budget, draft.budget),
    timeline: draft.timeline.map(({ title, weeksBefore, priority, category }) => ({ title, dueDate: resolveRelativeDate(request.eventDate, weeksBefore, today), priority, category })),
    vendors: draft.vendors.map(({ category, lookFor, questions, weeksBefore }) => ({ category, lookFor, questions, dueDate: resolveRelativeDate(request.eventDate, weeksBefore, today) })),
    ideas: draft.ideas,
  };
  return fullPlanResponseSchema.shape.plan.parse(response);
}
