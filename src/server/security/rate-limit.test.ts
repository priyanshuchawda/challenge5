import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  limit: vi.fn(),
  slidingWindow: vi.fn((...args: [number, string]) => ({ algorithm: `${args[0]}-${args[1]}` })),
  redisConstructor: vi.fn(),
  ratelimitConstructor: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({
  Redis: class {
    constructor(config: unknown) { mocks.redisConstructor(config); }
  },
}));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    constructor(config: unknown) { mocks.ratelimitConstructor(config); }
    static slidingWindow(limit: number, interval: string) { return mocks.slidingWindow(limit, interval); }
    limit = mocks.limit;
  },
}));

import { checkIdeaRateLimit } from "./rate-limit";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.limit.mockResolvedValue({ success: true, reset: Date.now() + 60_000 });
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
    expect(mocks.limit).not.toHaveBeenCalled();
  });

  it("uses the official shared sliding-window limiter", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example/");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");

    await expect(checkIdeaRateLimit(request("198.51.100.10"))).resolves.toEqual({ allowed: true });
    expect(mocks.redisConstructor).toHaveBeenCalledWith({ url: "https://redis.example/", token: "test-token" });
    expect(mocks.slidingWindow).toHaveBeenCalledWith(3, "60 s");
    expect(mocks.ratelimitConstructor).toHaveBeenCalledWith(expect.objectContaining({ prefix: "gatherwise:ideas:v2" }));
    expect(mocks.limit).toHaveBeenCalledWith(expect.stringMatching(/^[a-f0-9]{64}$/));
  });

  it("returns reset-based retry guidance when Upstash blocks a client", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    mocks.limit.mockResolvedValue({ success: false, reset: Date.now() + 42_000 });
    await expect(checkIdeaRateLimit(request())).resolves.toEqual({ allowed: false, retryAfter: 42 });
  });

  it("fails closed when the Upstash SDK cannot reach Redis", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    mocks.limit.mockRejectedValue(new Error("network failure"));
    await expect(checkIdeaRateLimit(request())).resolves.toEqual({ allowed: false, unavailable: true });
  });
});
