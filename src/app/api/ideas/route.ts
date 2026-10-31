import { NextResponse } from "next/server";
import { generateEventIdeas } from "@/server/ai/gemini";
import { parseIdeasRequest } from "@/server/ai/parse-planning-request";
import { providerErrorResponse } from "@/server/ai/provider-error-response";
import { readAIRequestBody } from "@/server/http/read-ai-request";
import { aiRateLimitResponse } from "@/server/security/ai-rate-limit-response";

export const maxDuration = 45;
const BODY_LIMIT = 8_192;

export async function POST(request: Request) {
  const body = await readAIRequestBody(request, BODY_LIMIT);
  if (!body.ok) return body.response;

  const parsed = parseIdeasRequest(body.value);
  if (!parsed.success)
    return NextResponse.json({ error: "Check the event details and try again." }, { status: 400 });

  const limitResponse = await aiRateLimitResponse(request, {
    unavailableMessage:
      "AI ideas are temporarily unavailable because usage protection is not configured.",
    limitedMessage: "Please wait before asking for more ideas.",
    noStoreOnLimited: false,
  });
  if (limitResponse) return limitResponse;

  try {
    const ideas = await generateEventIdeas(parsed.data);
    return NextResponse.json({ ideas }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return providerErrorResponse(error, "ideas");
  }
}
