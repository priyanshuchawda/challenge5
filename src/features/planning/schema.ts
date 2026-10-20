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
  spent: number;
};

export const expenseSchema = z.object({
  id: z.string().min(1).max(120),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().min(2).max(120),
  amount: z.number().int().positive().max(1_000_000_000),
  date: z.iso.date(),
});
export type Expense = z.infer<typeof expenseSchema>;

export const vendorSchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().trim().min(2).max(100),
  category: z.string().trim().min(2).max(80),
  status: z.enum(["Researching", "Contacted", "Quoted", "Booked"]),
  estimatedCost: z.number().int().nonnegative().max(1_000_000_000),
  notes: z.string().max(300),
});
export type Vendor = z.infer<typeof vendorSchema>;

export const runOfShowItemSchema = z.object({
  id: z.string().min(1).max(120),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  activity: z.string().trim().min(2).max(120),
  lead: z.string().trim().min(2).max(80),
  location: z.string().trim().min(2).max(100),
  notes: z.string().max(240),
});
export type RunOfShowItem = z.infer<typeof runOfShowItemSchema>;

export type EventPlan = {
  id: string;
  request: EventRequest;
  tasks: PlanTask[];
  budget: BudgetAllocation[];
  expenses: Expense[];
  vendors: Vendor[];
  runOfShow: RunOfShowItem[];
  createdAt: string;
};

const planSchema = z.object({
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
    spent: z.number().int().nonnegative().default(0),
  })).max(20),
  expenses: z.array(expenseSchema).max(500).default([]),
  vendors: z.array(vendorSchema).max(100).default([]),
  runOfShow: z.array(runOfShowItemSchema).max(40).default([]),
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
