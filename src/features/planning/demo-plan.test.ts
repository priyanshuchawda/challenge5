import { describe, expect, it } from "vitest";
import { createDemoPlan } from "./demo-plan";

describe("createDemoPlan", () => {
  it("returns independent demo data with a consistent budget and progress", () => {
    const first = createDemoPlan();
    const second = createDemoPlan();

    expect(first).not.toBe(second);
    expect(first.id).toBe("demo-wedding");
    expect(first.budget.reduce((total, item) => total + item.amount, 0)).toBe(first.request.budget);
    expect(first.tasks.filter((task) => task.completed)).toHaveLength(2);

    const firstTask = first.tasks[0];
    if (!firstTask) throw new Error("Demo plan should include tasks");
    firstTask.completed = false;
    expect(second.tasks[0]?.completed).toBe(true);
  });
});
