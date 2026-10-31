import { NextResponse } from "next/server";
import { checkIdeaRateLimit } from "./rate-limit";

interface RateLimitResponseOptions {
  unavailableMessage: string;
  limitedMessage: string;
  noStoreOnLimited: boolean;
}

export async function aiRateLimitResponse(
  request: Request,
  options: RateLimitResponseOptions,
): Promise<NextResponse | null> {
  const result = await checkIdeaRateLimit(request);
  if (result.allowed) return null;
  if ("unavailable" in result) {
    return NextResponse.json(
      { error: options.unavailableMessage },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const headers = new Headers({ "Retry-After": String(result.retryAfter) });
  if (options.noStoreOnLimited) headers.set("Cache-Control", "no-store");
  return NextResponse.json({ error: options.limitedMessage }, { status: 429, headers });
}
