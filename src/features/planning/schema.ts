import { z } from "zod";

export const eventRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(["Wedding", "Birthday", "Community event"]),
  date: z.iso.date(),
  guests: z.number().int().min(1).max(5000),
  budget: z.number().int().min(1).max(1_000_000_000),
  location: z.string().trim().min(2).max(120),
  priorities: z.array(z.string().trim().min(1).max(40)).max(8),
});

export type EventRequest = z.infer<typeof eventRequestSchema>;

export type PlanTask = {
  id: string;
  title: string;
  dueDate: string;
  priority: "High" | "Medium" | "Low";
  category: string;
  completed: boolean;
};

export type BudgetAllocation = {
  category: string;
  amount: number;
  color: string;
};

export type EventPlan = {
  id: string;
  request: EventRequest;
  tasks: PlanTask[];
  budget: BudgetAllocation[];
  createdAt: string;
};

export const planSchema = z.object({
  id: z.string().min(1).max(100),
  request: eventRequestSchema,
  tasks: z.array(z.object({
    id: z.string().min(1).max(120),
    title: z.string().min(1).max(160),
    dueDate: z.iso.date(),
    priority: z.enum(["High", "Medium", "Low"]),
    category: z.string().min(1).max(80),
    completed: z.boolean(),
  })).max(100),
  budget: z.array(z.object({
    category: z.string().min(1).max(80),
    amount: z.number().int().nonnegative(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  })).max(20),
  createdAt: z.iso.datetime(),
});

export const plansSchema = z.array(planSchema).max(100);

export const ideaRequestSchema = eventRequestSchema.pick({
  type: true,
  date: true,
  guests: true,
  budget: true,
  location: true,
  priorities: true,
});

export const eventIdeasSchema = z.object({
  theme: z.string().trim().min(3).max(100),
  overview: z.string().trim().min(20).max(500),
  suggestions: z.array(z.object({
    title: z.string().trim().min(3).max(80),
    detail: z.string().trim().min(20).max(360),
    category: z.enum(["Atmosphere", "Food", "Accessibility", "Activities", "Contingency"]),
    budgetFriendly: z.boolean(),
  })).min(3).max(4),
  contingency: z.string().trim().min(20).max(360),
});

export type IdeaRequest = z.infer<typeof ideaRequestSchema>;
export type EventIdeas = z.infer<typeof eventIdeasSchema>;
export const ideasResponseSchema = z.object({ ideas: eventIdeasSchema });
