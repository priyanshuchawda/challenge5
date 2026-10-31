import { z } from "zod";
import { eventRequestSchema, supportedCurrencies } from "./event-schema";

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
  suggestions: z
    .array(
      z.object({
        title: z.string().trim().min(3).max(80),
        detail: z.string().trim().min(20).max(360),
        category: z.enum(["Atmosphere", "Food", "Accessibility", "Activities", "Contingency"]),
        budgetFriendly: z.boolean(),
      }),
    )
    .min(3)
    .max(4),
  contingency: z.string().trim().min(20).max(360),
});

export type IdeaRequest = z.infer<typeof ideaRequestSchema>;
export type EventIdeas = z.infer<typeof eventIdeasSchema>;
export const ideasResponseSchema = z.object({ ideas: eventIdeasSchema });
export type IdeasResponse = z.infer<typeof ideasResponseSchema>;

export const ideaRefinementRequestSchema = ideaRequestSchema.extend({
  refinement: z.string().trim().min(3).max(300),
  currentIdeas: eventIdeasSchema,
});
export type IdeaRefinementRequest = z.infer<typeof ideaRefinementRequestSchema>;

/** Request/response boundary for generating a complete, editable first-draft plan. */
export const fullPlanRequestSchema = z.object({
  eventType: z.enum(["Wedding", "Birthday", "Community event"]),
  eventDate: z.iso.date(),
  location: z.string().trim().min(2).max(120),
  guestCount: z.number().int().min(1).max(5000),
  budget: z.number().int().min(1).max(1_000_000_000),
  currency: z.enum(supportedCurrencies).default("INR"),
  vibe: z.string().trim().max(160).default(""),
  priorities: z.string().trim().max(500).default(""),
  language: z.string().trim().min(2).max(40).default("English"),
});
export type FullPlanRequest = z.infer<typeof fullPlanRequestSchema>;

export const fullPlanResponseSchema = z.object({
  plan: z.object({
    summary: z.string().trim().min(30).max(700),
    budget: z
      .array(
        z.object({
          category: z.string().trim().min(2).max(60),
          amount: z.number().int().nonnegative().max(1_000_000_000),
          percent: z.number().min(0).max(100).optional(),
          tip: z.string().trim().min(12).max(240),
          color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
          spent: z.number().int().nonnegative().default(0),
        }),
      )
      .min(3)
      .max(10),
    timeline: z
      .array(
        z.object({
          title: z.string().trim().min(3).max(120),
          dueDate: z.iso.date(),
          priority: z.enum(["High", "Medium", "Low"]),
          category: z.string().trim().min(2).max(60),
        }),
      )
      .min(5)
      .max(18),
    vendors: z
      .array(
        z.object({
          category: z.string().trim().min(2).max(60),
          lookFor: z.string().trim().min(15).max(240),
          questions: z.array(z.string().trim().min(8).max(180)).min(2).max(5),
          dueDate: z.iso.date(),
        }),
      )
      .min(2)
      .max(8),
    ideas: z
      .array(
        z.object({
          area: z.string().trim().min(2).max(40),
          title: z.string().trim().min(3).max(80),
          description: z.string().trim().min(20).max(280),
          whyItFits: z.string().trim().min(20).max(240),
        }),
      )
      .min(3)
      .max(6),
  }),
});
export type FullPlanResponse = z.infer<typeof fullPlanResponseSchema>;

export const fullPlanRefinementRequestSchema = fullPlanRequestSchema.extend({
  feedback: z.string().trim().min(3).max(300),
  previousPlan: fullPlanResponseSchema.shape.plan,
});
