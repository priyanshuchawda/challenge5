import { NextResponse } from "next/server";
import { fullPlanRequestSchema, fullPlanRefinementRequestSchema } from "@/features/planning/schema";
import { generateFullPlan } from "@/server/ai/full-plan";
import { GeminiError } from "@/server/ai/gemini";
import { checkIdeaRateLimit } from "@/server/security/rate-limit";
import { readBoundedJson } from "@/server/http/read-bounded-json";

export const maxDuration = 45;
const BODY_LIMIT = 24_576;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > BODY_LIMIT)
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });

  const body = await readBoundedJson(request, BODY_LIMIT);
  if (!body.ok) {
    return NextResponse.json(
      { error: body.status === 413 ? "Request is too large." : "Request must contain valid JSON." },
      { status: body.status },
    );
  }
  const candidate = body.value;

  const containsRefinement =
    typeof candidate === "object" &&
    candidate !== null &&
    ("feedback" in candidate || "previousPlan" in candidate);
  const parsed = containsRefinement
    ? fullPlanRefinementRequestSchema.safeParse(candidate)
    : fullPlanRequestSchema.safeParse(candidate);
  if (!parsed.success)
    return NextResponse.json({ error: "Check the event details and try again." }, { status: 400 });

  const limit = await checkIdeaRateLimit(request);
  if (!limit.allowed && "unavailable" in limit) {
    return NextResponse.json(
      {
        error: "AI planning is temporarily unavailable because usage protection is not configured.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (!limit.allowed)
    return NextResponse.json(
      { error: "Please wait before generating another plan." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfter), "Cache-Control": "no-store" },
      },
    );

  try {
    const result = await generateFullPlan(parsed.data);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.warn(
      "AI plan request failed",
      error instanceof GeminiError
        ? { providerStatus: error.status, httpStatus: error.httpStatus }
        : {
            providerStatus: "unexpected",
            errorName: error instanceof Error ? error.name : "unknown",
          },
    );
    if (error instanceof GeminiError && error.status === "quota") {
      return NextResponse.json(
        { error: "Gemini is at its free usage limit right now. Your saved plan is unchanged." },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    if (error instanceof GeminiError && error.status === "invalid_output") {
      return NextResponse.json(
        { error: "The AI returned an incomplete plan. Please try again later." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.json(
      { error: "AI planning is temporarily unavailable. Your saved plan is unchanged." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
