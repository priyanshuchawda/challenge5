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

  it("rejects malformed or invalid local data without throwing", () => {
    expect(readPlans("not-json")).toEqual([]);
    expect(readPlans(JSON.stringify([{ ...plan, budget: [{ amount: -2 }] }]))).toEqual([]);
    expect(readPlans(null)).toEqual([]);
  });
});
