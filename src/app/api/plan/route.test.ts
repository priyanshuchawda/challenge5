import { beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiError } from "@/server/ai/gemini";

const mocks = vi.hoisted(() => ({ generateFullPlan: vi.fn(), checkIdeaRateLimit: vi.fn() }));
vi.mock("@/server/ai/full-plan", () => ({ generateFullPlan: mocks.generateFullPlan }));
vi.mock("@/server/security/rate-limit", () => ({ checkIdeaRateLimit: mocks.checkIdeaRateLimit }));

import { POST } from "./route";

const validRequest = {
  eventType: "Birthday", eventDate: "2027-06-12", location: "Pune", guestCount: 24,
  budget: 80_000, currency: "INR", vibe: "garden", priorities: "Step-free access", language: "English",
};
const result = { plan: {
  summary: "A complete first draft for an accessible and relaxed event with practical next steps.",
  budget: [
    { category: "Venue", amount: 40_000, percent: 50, tip: "Confirm access and backup space with the venue.", color: "#728a67", spent: 0 },
    { category: "Food", amount: 24_000, percent: 30, tip: "Confirm dietary details with the caterer.", color: "#d59a65", spent: 0 },
    { category: "Activities", amount: 16_000, percent: 20, tip: "Choose a flexible activity for all guests.", color: "#cf8291", spent: 0 },
  ],
  timeline: [{ title: "Confirm venue", dueDate: "2027-05-12", priority: "High", category: "Venue" }],
  vendors: [{ category: "Venue", lookFor: "Look for step-free access and a quiet area on site.", questions: ["Is access step-free?", "Can we use a quiet area?"], dueDate: "2027-05-12" }],
  ideas: [{ area: "Access", title: "Quiet corner", description: "Set aside a calm space for guests who want a quieter break.", whyItFits: "This directly supports the priority for step-free and comfortable access." }],
} };

function request(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/plan", { method: "POST", headers: { "content-type": "application/json", ...headers }, body });
}

describe("POST /api/plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkIdeaRateLimit.mockResolvedValue({ allowed: true });
    mocks.generateFullPlan.mockResolvedValue(result);
  });

  it("uses a bounded function duration for the primary and fallback AI calls", async () => {
    const { maxDuration } = await import("./route");
    expect(maxDuration).toBe(45);
  });

  it("returns the structured plan with no-store caching and forwards the request", async () => {
    const response = await POST(request(JSON.stringify(validRequest)));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual(result);
    expect(mocks.generateFullPlan).toHaveBeenCalledWith({ ...validRequest, currency: "INR", vibe: "garden", language: "English" });
  });

  it("supports a refinement request with a validated previous plan", async () => {
    const previousPlan = {
      ...result.plan,
      budget: result.plan.budget.map(({ category, amount, tip, color }) => ({ category, amount, tip, color })),
      timeline: Array.from({ length: 5 }, (_, index) => ({ ...result.plan.timeline[0], title: `Task ${index + 1}` })),
      vendors: [result.plan.vendors[0], { ...result.plan.vendors[0], category: "Food" }],
      ideas: Array.from({ length: 3 }, (_, index) => ({ ...result.plan.ideas[0], title: `Idea ${index + 1}` })),
    };
    const body = { ...validRequest, feedback: "Make it simpler", previousPlan };
    const response = await POST(request(JSON.stringify(body)));
    expect(response.status).toBe(200);
  });

  it("rejects invalid input before consuming an AI request", async () => {
    const response = await POST(request(JSON.stringify({ ...validRequest, guestCount: -1 })));
    expect(response.status).toBe(400);
    expect(mocks.checkIdeaRateLimit).not.toHaveBeenCalled();
    expect(mocks.generateFullPlan).not.toHaveBeenCalled();
  });

  it("rejects malformed and oversized request bodies", async () => {
    expect((await POST(request("{"))).status).toBe(400);
    expect((await POST(request("{}", { "content-length": "24577" }))).status).toBe(413);
    expect(mocks.checkIdeaRateLimit).not.toHaveBeenCalled();
  });

  it("returns a controlled response when request body reading fails", async () => {
    const unreadableRequest = {
      headers: new Headers(),
      text: () => Promise.reject(new Error("stream failure")),
    } as unknown as Request;
    const response = await POST(unreadableRequest);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Request must contain valid JSON." });
  });

  it("fails closed when distributed rate limiting is unavailable", async () => {
    mocks.checkIdeaRateLimit.mockResolvedValue({ allowed: false, unavailable: true });
    const response = await POST(request(JSON.stringify(validRequest)));
    expect(response.status).toBe(503);
    expect(mocks.generateFullPlan).not.toHaveBeenCalled();
  });

  it("returns retry guidance when rate limited", async () => {
    mocks.checkIdeaRateLimit.mockResolvedValue({ allowed: false, retryAfter: 60 });
    const response = await POST(request(JSON.stringify(validRequest)));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
  });

  it.each([
    [new GeminiError("quota"), 503],
    [new GeminiError("invalid_output"), 502],
    [new Error("private provider details"), 503],
  ])("maps provider failure to safe HTTP status", async (error, status) => {
    mocks.generateFullPlan.mockRejectedValue(error);
    const response = await POST(request(JSON.stringify(validRequest)));
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.text()).includes("private provider details")).toBe(false);
  });
});
