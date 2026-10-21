import { beforeEach, describe, expect, it, vi } from "vitest";
import { GeminiError } from "@/server/ai/gemini";

const mocks = vi.hoisted(() => ({
  generateEventIdeas: vi.fn(),
  checkIdeaRateLimit: vi.fn(),
}));

vi.mock("@/server/ai/gemini", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/ai/gemini")>();
  return { ...actual, generateEventIdeas: mocks.generateEventIdeas };
});
vi.mock("@/server/security/rate-limit", () => ({ checkIdeaRateLimit: mocks.checkIdeaRateLimit }));

import { POST } from "./route";

const validInput = {
  type: "Birthday",
  date: "2027-06-12",
  guests: 20,
  budget: 80_000,
  location: "Pune",
  priorities: ["Step-free access"],
};
const validIdeas = {
  theme: "Garden gathering",
  overview: "A relaxed afternoon with thoughtful details for every guest.",
  suggestions: [
    {
      title: "Welcome table",
      detail: "Offer water and a clear sign near the accessible entrance.",
      category: "Accessibility",
      budgetFriendly: true,
    },
    {
      title: "Shared meal",
      detail: "Label each dish and offer a simple vegetarian option.",
      category: "Food",
      budgetFriendly: true,
    },
    {
      title: "Memory cards",
      detail: "Invite guests to share a short birthday memory.",
      category: "Activities",
      budgetFriendly: true,
    },
  ],
  contingency: "Move the gathering to a confirmed indoor space if the weather changes.",
};

function request(body: string, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/ideas", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

describe("POST /api/ideas", () => {
  it("bounds API execution below the Hobby function maximum", async () => {
    const { maxDuration } = await import("./route");
    expect(maxDuration).toBe(45);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkIdeaRateLimit.mockResolvedValue({ allowed: true });
    mocks.generateEventIdeas.mockResolvedValue(validIdeas);
  });

  it("returns validated ideas without caching them", async () => {
    const response = await POST(request(JSON.stringify(validInput)));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ ideas: validIdeas });
    expect(mocks.generateEventIdeas).toHaveBeenCalledWith(validInput);
  });

  it("accepts a bounded refinement with the prior structured ideas", async () => {
    const refinementRequest = {
      ...validInput,
      refinement: "Make this more budget-friendly",
      currentIdeas: validIdeas,
    };
    const response = await POST(request(JSON.stringify(refinementRequest)));
    expect(response.status).toBe(200);
    expect(mocks.generateEventIdeas).toHaveBeenCalledWith(refinementRequest);
  });

  it("rejects malformed refinements before consuming an AI quota", async () => {
    const response = await POST(
      request(JSON.stringify({ ...validInput, refinement: "x", currentIdeas: validIdeas })),
    );
    expect(response.status).toBe(400);
    expect(mocks.checkIdeaRateLimit).not.toHaveBeenCalled();
    expect(mocks.generateEventIdeas).not.toHaveBeenCalled();
  });

  it("rejects invalid context before consuming an AI quota", async () => {
    const response = await POST(request(JSON.stringify({ ...validInput, guests: -3 })));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Check the event details and try again.",
    });
    expect(mocks.checkIdeaRateLimit).not.toHaveBeenCalled();
  });

  it("rejects oversized declared and actual bodies", async () => {
    const declared = await POST(request("{}", { "content-length": "8193" }));
    expect(declared.status).toBe(413);
    const actual = await POST(request(JSON.stringify({ data: "x".repeat(9_000) })));
    expect(actual.status).toBe(413);
    expect(mocks.checkIdeaRateLimit).not.toHaveBeenCalled();
  });

  it("returns a controlled error for malformed JSON", async () => {
    const response = await POST(request("{"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Request must contain valid JSON." });
  });

  it("fails closed if shared rate limiting is unavailable", async () => {
    mocks.checkIdeaRateLimit.mockResolvedValue({ allowed: false, unavailable: true });
    const response = await POST(request(JSON.stringify(validInput)));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.generateEventIdeas).not.toHaveBeenCalled();
  });

  it("returns retry guidance when the caller is rate limited", async () => {
    mocks.checkIdeaRateLimit.mockResolvedValue({ allowed: false, retryAfter: 42 });
    const response = await POST(request(JSON.stringify(validInput)));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("42");
    expect(mocks.generateEventIdeas).not.toHaveBeenCalled();
  });

  it.each([
    [
      new GeminiError("quota"),
      503,
      "Gemini is at its free usage limit right now. Your saved plan is unchanged.",
    ],
    [
      new GeminiError("invalid_output"),
      502,
      "The AI returned an incomplete idea set. Please try again later.",
    ],
    [
      new GeminiError("unavailable"),
      503,
      "AI ideas are temporarily unavailable. Your saved plan is unchanged.",
    ],
    [
      new Error("secret provider details"),
      503,
      "AI ideas are temporarily unavailable. Your saved plan is unchanged.",
    ],
  ])("maps provider failures to safe responses", async (error, status, message) => {
    mocks.generateEventIdeas.mockRejectedValue(error);
    const response = await POST(request(JSON.stringify(validInput)));
    expect(response.status).toBe(status);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ error: message });
  });
});
