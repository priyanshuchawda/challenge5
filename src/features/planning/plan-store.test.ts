import { afterEach, describe, expect, it, vi } from "vitest";
import { getPlansSnapshot, getServerPlansSnapshot, readPlans, savePlans, subscribeToPlans } from "./plan-store";
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


describe("browser storage adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads and validates snapshots from local storage", () => {
    const values = new Map([["gatherwise.plans.v1", JSON.stringify([plan])]]);
    vi.stubGlobal("window", {
      localStorage: { getItem: (key: string) => values.get(key) ?? null },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true,
    });
    expect(getPlansSnapshot()).toBe(JSON.stringify([plan]));
    expect(getServerPlansSnapshot()).toBeNull();
  });

  it("persists schema-valid plans and notifies local subscribers", () => {
    const values = new Map<string, string>();
    const listeners = new Map<string, Set<() => void>>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
      addEventListener: (name: string, listener: () => void) => {
        const group = listeners.get(name) ?? new Set();
        group.add(listener);
        listeners.set(name, group);
      },
      removeEventListener: (name: string, listener: () => void) => listeners.get(name)?.delete(listener),
      dispatchEvent: (event: Event) => {
        listeners.get(event.type)?.forEach((listener) => listener());
        return true;
      },
    });

    const onChange = vi.fn();
    const unsubscribe = subscribeToPlans(onChange);
    savePlans([plan]);
    expect(readPlans(getPlansSnapshot())).toEqual([plan]);
    expect(onChange).toHaveBeenCalledOnce();
    unsubscribe();
    listeners.get("gatherwise:plans-changed")?.forEach((listener) => listener());
    expect(onChange).toHaveBeenCalledOnce();
  });

  it("rejects invalid state before writing and safely handles server-side calls", () => {
    const setItem = vi.fn();
    vi.stubGlobal("window", { localStorage: { setItem }, dispatchEvent: vi.fn() });
    expect(() => savePlans([{ ...plan, id: "" }])).toThrow("The event plan could not be saved.");
    expect(setItem).not.toHaveBeenCalled();
    vi.stubGlobal("window", undefined);
    expect(getPlansSnapshot()).toBeNull();
    expect(() => savePlans([plan])).not.toThrow();
    expect(subscribeToPlans(vi.fn())()).toBeUndefined();
  });
});
