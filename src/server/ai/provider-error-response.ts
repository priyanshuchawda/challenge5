import { NextResponse } from "next/server";
import { GeminiError } from "./gemini-client";

type AIProviderFeature = "ideas" | "plan";

export function providerErrorResponse(error: unknown, feature: AIProviderFeature): NextResponse {
  if (feature === "plan") {
    console.warn(
      "AI plan request failed",
      error instanceof GeminiError
        ? { providerStatus: error.status, httpStatus: error.httpStatus }
        : {
            providerStatus: "unexpected",
            errorName: error instanceof Error ? error.name : "unknown",
          },
    );
  }

  const quota = error instanceof GeminiError && error.status === "quota";
  const invalidOutput = error instanceof GeminiError && error.status === "invalid_output";
  const message = providerErrorMessage(feature, quota, invalidOutput);
  const status = invalidOutput ? 502 : 503;
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function providerErrorMessage(feature: AIProviderFeature, quota: boolean, invalidOutput: boolean) {
  if (quota) return "Gemini is at its free usage limit right now. Your saved plan is unchanged.";
  if (invalidOutput) {
    return feature === "ideas"
      ? "The AI returned an incomplete idea set. Please try again later."
      : "The AI returned an incomplete plan. Please try again later.";
  }
  return feature === "ideas"
    ? "AI ideas are temporarily unavailable. Your saved plan is unchanged."
    : "AI planning is temporarily unavailable. Your saved plan is unchanged.";
}
