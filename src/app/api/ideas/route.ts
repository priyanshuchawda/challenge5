import { NextResponse } from "next/server";
import { ideaRefinementRequestSchema, ideaRequestSchema } from "@/features/planning/schema";
import { generateEventIdeas, GeminiError } from "@/server/ai/gemini";
import { checkIdeaRateLimit } from "@/server/security/rate-limit";

export const maxDuration = 25;
const BODY_LIMIT = 8_192;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > BODY_LIMIT) return NextResponse.json({ error: "Request is too large." }, { status: 413 });

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (new TextEncoder().encode(rawBody).byteLength > BODY_LIMIT) return NextResponse.json({ error: "Request is too large." }, { status: 413 });

  let candidate: unknown;
  try {
    candidate = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Request must contain valid JSON." }, { status: 400 });
  }
  const containsRefinement = typeof candidate === "object" && candidate !== null &&
    ("refinement" in candidate || "currentIdeas" in candidate);
  const initialRequest = containsRefinement
    ? ideaRefinementRequestSchema.safeParse(candidate)
    : ideaRequestSchema.safeParse(candidate);
  if (!initialRequest.success) return NextResponse.json({ error: "Check the event details and try again." }, { status: 400 });

  const limit = await checkIdeaRateLimit(request);
  if (!limit.allowed && "unavailable" in limit) {
    return NextResponse.json({ error: "AI ideas are temporarily unavailable because usage protection is not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (!limit.allowed) {
    return NextResponse.json({ error: "Please wait before asking for more ideas." }, { status: 429, headers: { "Retry-After": String(limit.retryAfter) } });
  }

  try {
    const ideas = await generateEventIdeas(initialRequest.data);
    return NextResponse.json({ ideas }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof GeminiError && error.status === "quota") {
      return NextResponse.json({ error: "Gemini is at its free usage limit right now. Your saved plan is unchanged." }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof GeminiError && error.status === "invalid_output") {
      return NextResponse.json({ error: "The AI returned an incomplete idea set. Please try again later." }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "AI ideas are temporarily unavailable. Your saved plan is unchanged." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
