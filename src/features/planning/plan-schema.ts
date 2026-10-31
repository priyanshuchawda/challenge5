import { z } from "zod";
import {
  type BudgetAllocation,
  type EventRequest,
  type Expense,
  type PlanTask,
  type RunOfShowItem,
  type Vendor,
  budgetAllocationSchema,
  eventRequestSchema,
  expenseSchema,
  runOfShowItemSchema,
  vendorSchema,
} from "./event-schema";

export interface EventPlan {
  id: string;
  request: EventRequest;
  tasks: PlanTask[];
  budget: BudgetAllocation[];
  expenses: Expense[];
  vendors: Vendor[];
  runOfShow: RunOfShowItem[];
  createdAt: string;
}

const eventPlanSchema = z.object({
  id: z.string().min(1).max(100),
  request: eventRequestSchema,
  tasks: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        title: z.string().min(1).max(160),
        dueDate: z.iso.date(),
        priority: z.enum(["High", "Medium", "Low"]),
        category: z.string().min(1).max(80),
        completed: z.boolean(),
      }),
    )
    .max(100),
  budget: z.array(budgetAllocationSchema).max(20),
  expenses: z.array(expenseSchema).max(500).default([]),
  vendors: z.array(vendorSchema).max(100).default([]),
  runOfShow: z.array(runOfShowItemSchema).max(40).default([]),
  createdAt: z.iso.datetime(),
});

export const plansSchema = z.array(eventPlanSchema).max(100);
