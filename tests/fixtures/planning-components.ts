import { createDemoPlan } from "@/features/planning/demo-plan";
import type { EventIdeas } from "@/features/planning/schema";

export const plan = createDemoPlan();

export const validIdeas: EventIdeas = {
  theme: "A garden celebration",
  overview: "Use warm, thoughtful details to make the celebration easy to enjoy.",
  suggestions: [
    {
      title: "Welcome sign",
      detail: "Place a clear welcome sign next to the accessible path to the venue.",
      category: "Accessibility",
      budgetFriendly: true,
    },
    {
      title: "Seasonal meal",
      detail: "Choose a seasonal menu and label every dish for guests.",
      category: "Food",
      budgetFriendly: false,
    },
    {
      title: "Memory cards",
      detail: "Invite guests to leave a short memory for the couple.",
      category: "Activities",
      budgetFriendly: true,
    },
  ],
  contingency: "Move to a confirmed indoor space if the weather changes during the day.",
};

export const validFullPlanResponse = {
  plan: {
    summary: "A practical draft keeps accessibility, dietary needs, and spending in view.",
    budget: ["Venue", "Food", "Activities"].map((category) => ({
      category,
      amount: 300,
      tip: "Confirm the details and compare the options before making a commitment.",
      color: "#728a67",
      spent: 0,
    })),
    timeline: Array.from({ length: 5 }, (_, index) => ({
      title: `Planning milestone ${index + 1}`,
      dueDate: "2026-11-20",
      priority: "Medium" as const,
      category: "Planning",
    })),
    vendors: ["Venue", "Food"].map((category) => ({
      category,
      lookFor: "A reliable option that can support the event’s stated access requirements.",
      questions: ["Can you confirm the details?", "What are the cancellation terms?"],
      dueDate: "2026-11-20",
    })),
    ideas: Array.from({ length: 3 }, (_, index) => ({
      area: "Accessibility",
      title: `Thoughtful idea ${index + 1}`,
      description: "Offer a clear, welcoming option guests can choose at their own pace.",
      whyItFits: "This supports the stated priorities and makes participation more comfortable.",
    })),
  },
};

export function jsonResponseForComponent(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function requireForm(dialog: HTMLElement): HTMLFormElement {
  const form = dialog.querySelector("form");
  if (!form) throw new Error("Dialog form should be present");
  return form;
}
