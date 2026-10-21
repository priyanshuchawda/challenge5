import { afterEach, describe, expect, it, vi } from "vitest";
import { generateEventIdeas } from "./gemini";
import { eventRequestSchema } from "@/features/planning/schema";

const input = eventRequestSchema.parse({
  name: "Test celebration", type: "Birthday", date: "2027-06-12", guests: 40,
  budget: 250000, location: "Pune", priorities: ["Step-free access"],
});
const validIdeas = {
  theme: "A relaxed garden gathering",
  overview: "Use a small number of thoughtful details to make the gathering feel welcoming and easy to navigate.",
  suggestions: [
    { title: "A clear welcome point", detail: "Place a welcome sign near the entrance and keep the path to seating easy to identify.", category: "Accessibility", budgetFriendly: true },
    { title: "Seasonal shared menu", detail: "Ask a local caterer about a simple seasonal menu that fits your confirmed dietary needs.", category: "Food", budgetFriendly: true },
    { title: "Memory card table", detail: "Invite guests to leave a short birthday memory at a table beside the welcome area.", category: "Activities", budgetFriendly: true },
  ],
  contingency: "If weather changes, move guests to a confirmed indoor space and share the update through the invitation channel.",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Gemini planning provider", () => {
  it("sends bounded event context and validates the structured response", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(validIdeas) }] } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateEventIdeas(input)).resolves.toEqual(validIdeas);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/models/gemini-3.5-flash-lite:generateContent");
    expect((options.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-key");
    expect(String(options.body)).not.toContain("Test celebration");
    expect(String(options.body)).toContain("Step-free access");
  });

  it("treats refinement feedback and prior suggestions as untrusted data", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(validIdeas) }] } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const refinement = { ...input, refinement: "Make this more affordable", currentIdeas: validIdeas };

    await expect(generateEventIdeas(refinement)).resolves.toEqual(validIdeas);
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const requestBody = JSON.parse(String(options.body)) as { systemInstruction: { parts: Array<{ text: string }> }; contents: Array<{ parts: Array<{ text: string }> }>; generationConfig: { maxOutputTokens: number } };
    expect(requestBody.systemInstruction.parts[0]?.text).toContain("untrusted data");
    expect(requestBody.contents[0]?.parts[0]?.text).toContain("Make this more affordable");
    expect(requestBody.contents[0]?.parts[0]?.text).toContain(validIdeas.theme);
    expect(requestBody.generationConfig.maxOutputTokens).toBe(1800);
  });

  it("fails closed when no server key is configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(generateEventIdeas(input)).rejects.toMatchObject({ status: "unavailable" });
  });

  it("rejects output that does not meet the application schema", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"theme":"Incomplete"}' }] } }] }), { status: 200 })));
    await expect(generateEventIdeas(input)).rejects.toMatchObject({ status: "invalid_output" });
  });

  it("maps upstream quota responses to a controlled provider error", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-primary-test");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "gemini-fallback-test");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateEventIdeas(input)).rejects.toMatchObject({ status: "quota" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("gemini-primary-test");
  });

  it("falls back to Flash only after a transient primary server failure", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-primary-test");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "gemini-fallback-test");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("{}", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(validIdeas) }] } }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateEventIdeas(input)).resolves.toEqual(validIdeas);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("gemini-primary-test");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("gemini-fallback-test");
  });

  it("does not retry bad credentials or model configuration against fallback", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-primary-test");
    vi.stubEnv("GEMINI_FALLBACK_MODEL", "gemini-fallback-test");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(generateEventIdeas(input)).rejects.toMatchObject({ status: "unavailable", httpStatus: 400 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
