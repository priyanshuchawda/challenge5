import { NextResponse } from "next/server";
import { generateFullPlan } from "@/server/ai/full-plan";
import { parseFullPlanRequest } from "@/server/ai/parse-planning-request";
import { providerErrorResponse } from "@/server/ai/provider-error-response";
import { readAIRequestBody } from "@/server/http/read-ai-request";
import { aiRateLimitResponse } from "@/server/security/ai-rate-limit-response";

export const maxDuration = 45;
const BODY_LIMIT = 24_576;

export async function POST(request: Request) {
  const body = await readAIRequestBody(request, BODY_LIMIT);
  if (!body.ok) return body.response;

  const parsed = parseFullPlanRequest(body.value);
  if (!parsed.success)
    return NextResponse.json({ error: "Check the event details and try again." }, { status: 400 });

  const limitResponse = await aiRateLimitResponse(request, {
    unavailableMessage:
      "AI planning is temporarily unavailable because usage protection is not configured.",
    limitedMessage: "Please wait before generating another plan.",
    noStoreOnLimited: true,
  });
  if (limitResponse) return limitResponse;

  try {
    const result = await generateFullPlan(parsed.data);
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return providerErrorResponse(error, "plan");
  }
}
