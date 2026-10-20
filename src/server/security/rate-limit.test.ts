import { describe, expect, it } from "vitest";
import { checkIdeaRateLimit } from "./rate-limit";

describe("AI request limits", () => {
  it("limits an anonymous client to three requests in a minute", async () => {
    const identity = `test-${crypto.randomUUID()}`;
    const request = new Request("http://localhost/api/ideas", { headers: { "x-real-ip": identity } });
    await expect(checkIdeaRateLimit(request)).resolves.toEqual({ allowed: true });
    await expect(checkIdeaRateLimit(request)).resolves.toEqual({ allowed: true });
    await expect(checkIdeaRateLimit(request)).resolves.toEqual({ allowed: true });
    await expect(checkIdeaRateLimit(request)).resolves.toMatchObject({ allowed: false, retryAfter: expect.any(Number) });
  });
});
