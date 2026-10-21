import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createHash } from "node:crypto";

const WINDOW = "60 s";
const MAX_REQUESTS = 3;
const localWindows = new Map<string, { startedAt: number; count: number }>();
let distributedLimiter: { key: string; limiter: Ratelimit } | undefined;

type RateResult = { allowed: true } | { allowed: false; retryAfter: number } | { allowed: false; unavailable: true };

function createDistributedLimiter(url: string, token: string) {
  const redis = new Redis({ url, token });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(MAX_REQUESTS, WINDOW),
    prefix: "gatherwise:ideas:v2",
  });
}

function getDistributedLimiter(url: string, token: string): Ratelimit {
  const key = createHash("sha256").update(`${url}\0${token}`).digest("hex");
  if (distributedLimiter?.key !== key) distributedLimiter = { key, limiter: createDistributedLimiter(url, token) };
  return distributedLimiter.limiter;
}

async function distributedLimit(identity: string): Promise<RateResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { allowed: false, unavailable: true };

  try {
    const { success, reset } = await getDistributedLimiter(url, token).limit(identity);
    if (success) return { allowed: true };
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((reset - Date.now()) / 1_000)) };
  } catch {
    return { allowed: false, unavailable: true };
  }
}

export async function checkIdeaRateLimit(request: Request): Promise<RateResult> {
  const address = request.headers.get("x-real-ip")?.trim() || "local-anonymous";
  const identity = createHash("sha256").update(address).digest("hex");

  if (process.env.NODE_ENV === "production" && process.env.LOCAL_AI_RATE_LIMIT !== "true") return distributedLimit(identity);

  const now = Date.now();
  const current = localWindows.get(identity);
  if (!current || now - current.startedAt >= 60_000) {
    localWindows.set(identity, { startedAt: now, count: 1 });
    return { allowed: true };
  }
  current.count += 1;
  if (current.count > MAX_REQUESTS) return { allowed: false, retryAfter: Math.max(1, Math.ceil((60_000 - (now - current.startedAt)) / 1_000)) };
  return { allowed: true };
}
