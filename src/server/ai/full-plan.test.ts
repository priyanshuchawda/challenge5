import { afterEach, describe, expect, it, vi } from "vitest";
import { generateFullPlan } from "./full-plan";

const input = {
  eventType: "Birthday" as const,
  eventDate: "2027-06-12",
  location: "Pune",
  guestCount: 40,
  budget: 250_000,
  currency: "INR" as const,
  vibe: "garden brunch",
  priorities: "Step-free access, quiet space",
  language: "English",
};
const draft = {
  summary:
    "A relaxed, accessible garden birthday with a practical schedule and clear budget priorities.",
  budget: [
    {
      category: "Venue",
      weight: 3,
      rationale: "Prioritize step-free access and a weather-safe backup.",
    },
    {
      category: "Food",
      weight: 2,
      rationale: "Confirm dietary needs and label the dishes clearly.",
    },
    {
      category: "Activities",
      weight: 1,
      rationale: "Choose flexible activities for a mixed-age group.",
    },
  ],
  timeline: Array.from({ length: 5 }, (_, index) => ({
    title: `Planning milestone ${index + 1}`,
    weeksBefore: index * 2,
    priority: "Medium",
    category: "Planning",
  })),
  vendors: [
    {
      category: "Venue",
      lookFor: "A step-free venue with a quiet area and indoor backup space.",
      questions: ["Is the entrance step-free?", "What is the cancellation policy?"],
      weeksBefore: 8,
    },
    {
      category: "Catering",
      lookFor: "A caterer who can label ingredients and confirm dietary requirements.",
      questions: ["Can you label all dishes?", "When is the final guest count due?"],
      weeksBefore: 6,
    },
  ],
  ideas: Array.from({ length: 3 }, (_, index) => ({
    area: "Accessibility",
    title: `Thoughtful idea ${index + 1}`,
    description: "Offer a simple, welcoming option guests can choose at their own pace.",
    whyItFits: "This supports the access priority and makes participation comfortable.",
  })),
};

function response(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }] }),
    { status },
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Gemini full-plan provider", () => {
  it("uses Flash-Lite and returns the app-validated exact-budget plan", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "");
    const fetchMock = vi.fn().mockImplementation(() => response(draft));
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateFullPlan(input);
    expect(result.plan.budget.reduce((sum, item) => sum + item.amount, 0)).toBe(input.budget);
    expect(result.plan.timeline[0]?.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("gemini-3.5-flash-lite");
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
    expect(String(options.body)).toContain("Step-free access");
  });

  it("preserves the previous plan and treats refinement feedback as untrusted data", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockImplementation(() => response(draft));
    vi.stubGlobal("fetch", fetchMock);
    const previous = await generateFullPlan(input);
    const previousPlan = {
      ...previous.plan,
      budget: previous.plan.budget.map(({ category, amount, tip, color }) => ({
        category,
        amount,
        tip,
        color,
      })),
    };
    const refinement = {
      ...input,
      feedback: "Keep access arrangements but lower food cost",
      previousPlan,
    };
    await generateFullPlan(refinement);
    const [, options] = fetchMock.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(String(options.body)) as {
      systemInstruction: { parts: Array<{ text: string }> };
      contents: Array<{ parts: Array<{ text: string }> }>;
      generationConfig: { maxOutputTokens: number };
    };
    expect(body.systemInstruction.parts[0]?.text).toContain("untrusted data");
    expect(body.contents[0]?.parts[0]?.text).toContain(refinement.feedback);
    expect(body.contents[0]?.parts[0]?.text).toContain(previousPlan.summary);
    expect(body.generationConfig.maxOutputTokens).toBe(5000);
  });

  it("recovers from incomplete primary output using one bounded fallback", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-primary-test");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "gemini-fallback-test");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ summary: "incomplete" }))
      .mockResolvedValueOnce(response(draft));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateFullPlan(input)).resolves.toHaveProperty("plan.budget");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("gemini-primary-test");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("gemini-fallback-test");
  });

  it("maps network failures to a controlled provider error", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network detail")));
    await expect(generateFullPlan(input)).rejects.toMatchObject({ status: "unavailable" });
  });

  it.each([
    {},
    { candidates: [] },
    { candidates: [{ content: { parts: [] } }] },
    { candidates: [{ content: { parts: [{ text: "not-json" }] } }] },
  ])("rejects malformed upstream response envelopes", async (body) => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-primary-test");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "gemini-primary-test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })),
    );
    await expect(generateFullPlan(input)).rejects.toMatchObject({ status: "invalid_output" });
  });

  it("uses the Flash fallback after a transient primary failure", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-primary-test");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "gemini-fallback-test");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({}, 503))
      .mockResolvedValueOnce(response(draft));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateFullPlan(input)).resolves.toHaveProperty("plan.budget");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("gemini-primary-test");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("gemini-fallback-test");
  });
});
