import { plansSchema, type EventPlan } from "./schema";

const STORAGE_KEY = "gatherwise.plans.v1";
const CHANGE_EVENT = "gatherwise:plans-changed";

export function getPlansSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function getServerPlansSnapshot(): null {
  return null;
}

export function subscribeToPlans(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function readPlans(snapshot: string | null): EventPlan[] {
  if (!snapshot) return [];
  try {
    const parsed: unknown = JSON.parse(snapshot);
    const migrated = Array.isArray(parsed)
      ? parsed.map((item: unknown) => {
          if (!item || typeof item !== "object") return item;
          const record = item as Record<string, unknown>;
          return {
            expenses: [],
            vendors: [],
            runOfShow: [],
            ...record,
            budget: Array.isArray(record.budget)
              ? record.budget.map((allocation: unknown) => {
                  if (!allocation || typeof allocation !== "object") return allocation;
                  const value = allocation as Record<string, unknown>;
                  return { spent: 0, ...value };
                })
              : record.budget,
          };
        })
      : parsed;
    const result = plansSchema.safeParse(migrated);
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export function savePlans(plans: EventPlan[]): void {
  if (typeof window === "undefined") return;
  const result = plansSchema.safeParse(plans);
  if (!result.success) throw new Error("The event plan could not be saved.");
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
