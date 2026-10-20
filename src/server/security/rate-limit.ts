import { createHash } from "node:crypto";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 3;
const localWindows = new Map<string, { startedAt: number; count: number }>();

type RateResult = { allowed: true } | { allowed: false; retryAfter: number } | { allowed: false; unavailable: true };

async function distributedLimit(identity: string): Promise<RateResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { allowed: false, unavailable: true };

  const key = `gatherwise:ideas:${identity}`;
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/pipeline`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, WINDOW_SECONDS]]),
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) return { allowed: false, unavailable: true };
    const result: unknown = await response.json();
    if (!Array.isArray(result) || !result[0] || typeof result[0] !== "object" || !("result" in result[0]) || typeof result[0].result !== "number") {
      return { allowed: false, unavailable: true };
    }
    if (result[0].result > MAX_REQUESTS) return { allowed: false, retryAfter: WINDOW_SECONDS };
    return { allowed: true };
  } catch {
    return { allowed: false, unavailable: true };
  }
}

export async function checkIdeaRateLimit(request: Request): Promise<RateResult> {
  const address = request.headers.get("x-real-ip")?.trim() || "local-anonymous";
  const identity = createHash("sha256").update(address).digest("hex");

  if (process.env.NODE_ENV === "production") return distributedLimit(identity);

  const now = Date.now();
  const current = localWindows.get(identity);
  if (!current || now - current.startedAt >= WINDOW_SECONDS * 1_000) {
    localWindows.set(identity, { startedAt: now, count: 1 });
    return { allowed: true };
  }
  current.count += 1;
  if (current.count > MAX_REQUESTS) return { allowed: false, retryAfter: Math.max(1, Math.ceil((WINDOW_SECONDS * 1_000 - (now - current.startedAt)) / 1_000)) };
  return { allowed: true };
}
