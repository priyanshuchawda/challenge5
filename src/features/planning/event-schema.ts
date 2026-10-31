import { z } from "zod";

export const supportedCurrencies = ["INR", "USD", "EUR", "GBP", "AED", "CAD", "AUD"] as const;
export type Currency = (typeof supportedCurrencies)[number];

export const eventRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(["Wedding", "Birthday", "Community event"]),
  date: z.iso.date(),
  guests: z.number().int().min(1).max(5000),
  budget: z.number().int().min(1).max(1_000_000_000),
  currency: z.enum(supportedCurrencies).default("INR"),
  location: z.string().trim().min(2).max(120),
  priorities: z.array(z.string().trim().min(1).max(40)).max(8),
});
export type EventRequest = z.infer<typeof eventRequestSchema>;

export const taskDraftSchema = z.object({
  title: z.string().trim().min(2).max(160),
  dueDate: z.iso.date(),
  priority: z.enum(["High", "Medium", "Low"]),
  category: z.string().trim().min(2).max(80),
});
export type TaskDraft = z.infer<typeof taskDraftSchema>;
export type PlanTask = TaskDraft & { id: string; completed: boolean };

export const budgetAllocationSchema = z.object({
  category: z.string().trim().min(1).max(80),
  amount: z.number().int().nonnegative(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  spent: z.number().int().nonnegative().default(0),
});
export type BudgetAllocation = z.infer<typeof budgetAllocationSchema>;

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
