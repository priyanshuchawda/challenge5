import { describe, expect, it } from "vitest";
import { readPlans } from "./plan-store";
import { createPlan } from "./planner";
import { eventRequestSchema } from "./schema";

const plan = createPlan(eventRequestSchema.parse({
  name: "Demo celebration", type: "Birthday", date: "2027-06-12", guests: 20,
  budget: 80000, location: "Pune", priorities: [],
}), "stored-plan");

describe("local plan storage boundary", () => {
  it("accepts a plan matching the runtime schema", () => {
    expect(readPlans(JSON.stringify([plan]))).toEqual([plan]);
  });

  it("migrates previously saved plans with no expense or vendor fields", () => {
    const legacy = structuredClone(plan) as Record<string, unknown>;
    delete legacy.expenses;
    delete legacy.vendors;
    delete legacy.runOfShow;
    legacy.budget = (legacy.budget as Array<Record<string, unknown>>).map((allocation) => {
      const previous = { ...allocation };
      delete previous.spent;
      return previous;
    });
    const migrated = readPlans(JSON.stringify([legacy]));
    expect(migrated[0]).toMatchObject({ expenses: [], vendors: [], runOfShow: [] });
    expect(migrated[0]?.budget.every((item) => item.spent === 0)).toBe(true);
  });

  it("rejects malformed or invalid local data without throwing", () => {
    expect(readPlans("not-json")).toEqual([]);
    expect(readPlans(JSON.stringify([{ ...plan, budget: [{ amount: -2 }] }]))).toEqual([]);
    expect(readPlans(null)).toEqual([]);
  });
});
