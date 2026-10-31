import type { BudgetAllocation, EventRequest } from "./schema";

const budgetTemplates = {
  Wedding: [
    { category: "Venue", share: 0.28, color: "#728a67" },
    { category: "Food & drink", share: 0.3, color: "#d59a65" },
    { category: "Decor & flowers", share: 0.14, color: "#cf8291" },
    { category: "Photography", share: 0.12, color: "#8e83bd" },
    { category: "Music & fun", share: 0.09, color: "#6b9c9b" },
    { category: "Contingency", share: 0.07, color: "#d2c5aa" },
  ],
  Birthday: [
    { category: "Venue", share: 0.2, color: "#728a67" },
    { category: "Food & drink", share: 0.28, color: "#d59a65" },
    { category: "Decor & flowers", share: 0.12, color: "#cf8291" },
    { category: "Photography", share: 0.13, color: "#8e83bd" },
    { category: "Music & fun", share: 0.12, color: "#6b9c9b" },
    { category: "Contingency", share: 0.15, color: "#d2c5aa" },
  ],
  "Community event": [
    { category: "Venue", share: 0.2, color: "#728a67" },
    { category: "Food & drink", share: 0.28, color: "#d59a65" },
    { category: "Decor & flowers", share: 0.08, color: "#cf8291" },
    { category: "Photography", share: 0.05, color: "#8e83bd" },
    { category: "Music & fun", share: 0.12, color: "#6b9c9b" },
    { category: "Contingency", share: 0.27, color: "#d2c5aa" },
  ],
} as const;

const categoryKeywords: Record<string, readonly string[]> = {
  Venue: ["venue", "access", "accessibility", "location", "step-free"],
  "Food & drink": ["food", "drink", "catering", "dietary", "vegetarian", "menu"],
  "Decor & flowers": ["decor", "flowers", "theme", "design"],
  Photography: ["photo", "photography", "video", "memory"],
  "Music & fun": ["music", "fun", "entertainment", "activity", "activities"],
  Contingency: ["backup", "contingency", "reserve", "weather"],
};

export function allocateBudget(
  limit: number,
  type: EventRequest["type"] = "Wedding",
  priorities: string[] = [],
): BudgetAllocation[] {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1_000_000_000) {
    throw new RangeError("Budget must be a positive whole number within the supported limit.");
  }
  const template = budgetTemplates[type];
  const priorityWords = new Set(
    priorities
      .join(" ")
      .toLocaleLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean),
  );
  const reserve = template.find((item) => item.category === "Contingency");
  if (!reserve) throw new Error("Every event budget needs a contingency allocation.");
  const reserveAmount = Math.round(limit * reserve.share);
  const spendable = template.filter((item) => item.category !== "Contingency");
  const weights = spendable.map(({ category, share }) => {
    const matches = categoryKeywords[category]?.some((keyword) =>
      keyword.split("-").every((word) => priorityWords.has(word)),
    );
    return share * (matches ? 1.4 : 1);
  });
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const available = limit - reserveAmount;
  const rows = spendable.map((item, index) => {
    const exact = (available * (weights[index] ?? 0)) / weightTotal;
    const amount = Math.floor(exact);
    return { ...item, amount, remainder: exact - amount };
  });
  let leftover = available - rows.reduce((sum, row) => sum + row.amount, 0);
  const byRemainder = [...rows].sort((a, b) => b.remainder - a.remainder);
  for (let index = 0; leftover > 0; index += 1, leftover -= 1) {
    const row = byRemainder[index % byRemainder.length];
    if (row) row.amount += 1;
  }
  return [
    ...rows.map(({ category, color, amount }) => ({ category, color, amount, spent: 0 })),
    { category: reserve.category, color: reserve.color, amount: reserveAmount, spent: 0 },
  ];
}
