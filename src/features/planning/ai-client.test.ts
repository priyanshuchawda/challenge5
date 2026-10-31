import { afterEach, describe, expect, it, vi } from "vitest";
import {
  jsonResponseForComponent,
  validFullPlanResponse,
  validIdeas,
} from "../../../tests/fixtures/planning-components";
import { requestEventIdeas, requestFullPlan } from "./ai-client";

afterEach(() => vi.unstubAllGlobals());

describe("validated planning API client", () => {
  it("posts idea requests with the caller's abort signal and validates the response", async () => {
    const controller = new AbortController();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponseForComponent({ ideas: validIdeas }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(requestEventIdeas({ location: "Pune" }, controller.signal)).resolves.toEqual({
      ideas: validIdeas,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ideas",
      expect.objectContaining({
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("returns a validated full-plan response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(jsonResponseForComponent(validFullPlanResponse)),
    );

    await expect(requestFullPlan({ eventType: "Birthday" })).resolves.toEqual(
      validFullPlanResponse,
    );
  });

  it("uses a safe fallback when a failed API response has no public error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockImplementation(() => Promise.resolve(jsonResponseForComponent({}, 503))),
    );

    await expect(requestEventIdeas({}, new AbortController().signal)).rejects.toThrow(
      "AI ideas are temporarily unavailable.",
    );
    await expect(requestFullPlan({})).rejects.toThrow("AI planning is temporarily unavailable.");
  });

  it("rejects malformed successful responses with controlled messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockImplementation(() => Promise.resolve(jsonResponseForComponent({}))),
    );

    await expect(requestEventIdeas({}, new AbortController().signal)).rejects.toThrow(
      "The AI returned an incomplete response. Your saved plan is unchanged.",
    );
    await expect(requestFullPlan({})).rejects.toThrow(
      "The AI response was incomplete. Your saved plan is unchanged.",
    );
  });
});
