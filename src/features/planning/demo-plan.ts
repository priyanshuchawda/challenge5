import { eventRequestSchema } from "./schema";
import { createPlan } from "./planner";

export function createDemoPlan() {
  const request = eventRequestSchema.parse({
    name: "Maya’s garden wedding",
    type: "Wedding",
    date: "2026-12-12",
    guests: 96,
    budget: 1_800_000,
    location: "Pune, India",
    priorities: ["Step-free access", "Vegetarian menu"],
  });
  const plan = createPlan(request, "demo-wedding");

  return {
    ...plan,
    tasks: plan.tasks.map((task, index) => ({
      ...task,
      completed: index < 2,
    })),
  };
}
