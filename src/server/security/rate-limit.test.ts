import { afterEach, describe, expect, it, vi } from "vitest";
import { checkIdeaRateLimit } from "./rate-limit";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function request(identity = `test-${crypto.randomUUID()}`) {
  return new Request("http://localhost/api/ideas", { headers: { "x-real-ip": identity } });
}

describe("AI request limits", () => {
  it("limits a local client to three requests in a minute and resets the window", async () => {
    vi.useFakeTimers();
    const caller = request();
    await expect(checkIdeaRateLimit(caller)).resolves.toEqual({ allowed: true });
    await expect(checkIdeaRateLimit(caller)).resolves.toEqual({ allowed: true });
    await expect(checkIdeaRateLimit(caller)).resolves.toEqual({ allowed: true });
    await expect(checkIdeaRateLimit(caller)).resolves.toMatchObject({ allowed: false, retryAfter: 60 });
    vi.advanceTimersByTime(60_000);
    await expect(checkIdeaRateLimit(caller)).resolves.toEqual({ allowed: true });
  });

  it("fails closed when production shared-limit credentials are missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    await expect(checkIdeaRateLimit(request())).resolves.toEqual({ allowed: false, unavailable: true });
  });

  it("uses the local limiter only when explicitly enabled in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("LOCAL_AI_RATE_LIMIT", "true");
    await expect(checkIdeaRateLimit(request())).resolves.toEqual({ allowed: true });
  });

  it("uses Upstash and accepts counts within the configured limit", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example/");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ result: 2 }, { result: 1 }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(checkIdeaRateLimit(request("198.51.100.10"))).resolves.toEqual({ allowed: true });
    expect(fetchMock).toHaveBeenCalledWith("https://redis.example/pipeline", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ authorization: "Bearer test-token" }),
    }));
  });

  it("blocks Upstash counts above the configured limit", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([{ result: 4 }]), { status: 200 })));
    await expect(checkIdeaRateLimit(request())).resolves.toEqual({ allowed: false, retryAfter: 60 });
  });

  it.each([
    ["non-2xx response", async () => new Response("{}", { status: 503 })],
    ["invalid JSON", async () => new Response("not-json", { status: 200 })],
    ["malformed pipeline response", async () => new Response(JSON.stringify([{ result: "2" }]), { status: 200 })],
    ["network error", async () => { throw new Error("network failure"); }],
  ])("fails closed on Upstash %s", async (_name, response) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockImplementation(response));
    await expect(checkIdeaRateLimit(request())).resolves.toEqual({ allowed: false, unavailable: true });
  });
});
