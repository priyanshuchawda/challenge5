export const fullPlan = {
  summary:
    "A practical celebration plan that keeps access, dietary needs, and a clear schedule in view.",
  budget: [
    {
      category: "Venue",
      amount: 500,
      tip: "Confirm step-free access and a weather-safe backup location.",
      color: "#728a67",
      spent: 0,
    },
    {
      category: "Food",
      amount: 300,
      tip: "Confirm dietary needs and label the dishes clearly for all guests.",
      color: "#d59a65",
      spent: 0,
    },
    {
      category: "Activities",
      amount: 200,
      tip: "Choose activities guests can join comfortably at their own pace.",
      color: "#cf8291",
      spent: 0,
    },
  ],
  timeline: Array.from({ length: 5 }, (_, index) => ({
    title: `Planning milestone ${index + 1}`,
    dueDate: "2026-11-20",
    priority: "Medium" as const,
    category: "Planning",
  })),
  vendors: [
    {
      category: "Venue",
      lookFor: "A step-free venue with quiet seating and an indoor backup area.",
      questions: ["Is the entrance step-free?", "What is the cancellation policy?"],
      dueDate: "2026-11-20",
    },
    {
      category: "Food",
      lookFor: "A caterer who labels ingredients and can confirm dietary requirements.",
      questions: ["Can you label each dish?", "When is the final guest count due?"],
      dueDate: "2026-11-20",
    },
  ],
  ideas: Array.from({ length: 3 }, (_, index) => ({
    area: "Accessibility",
    title: `Thoughtful idea ${index + 1}`,
    description: "Offer a welcoming option guests can choose at their own pace.",
    whyItFits: "This supports the access priority and makes participation comfortable.",
  })),
};

export function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}
