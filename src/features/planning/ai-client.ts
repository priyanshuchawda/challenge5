import {
  fullPlanResponseSchema,
  ideasResponseSchema,
  type FullPlanResponse,
  type IdeasResponse,
} from "./schema";

interface AIResponseMessages {
  unavailable: string;
  incomplete: string;
}

function errorMessage(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null && "error" in body) {
    const detail = body.error;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

async function postValidated<T>(
  endpoint: string,
  payload: unknown,
  schema: { safeParse(value: unknown): { success: true; data: T } | { success: false } },
  messages: AIResponseMessages,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    ...(signal ? { signal } : {}),
  });
  const body: unknown = await response.json();
  if (!response.ok) throw new Error(errorMessage(body, messages.unavailable));

  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new Error(messages.incomplete);
  return parsed.data;
}

export function requestEventIdeas(payload: unknown, signal: AbortSignal): Promise<IdeasResponse> {
  return postValidated(
    "/api/ideas",
    payload,
    ideasResponseSchema,
    {
      unavailable: "AI ideas are temporarily unavailable.",
      incomplete: "The AI returned an incomplete response. Your saved plan is unchanged.",
    },
    signal,
  );
}

export function requestFullPlan(payload: unknown): Promise<FullPlanResponse> {
  return postValidated("/api/plan", payload, fullPlanResponseSchema, {
    unavailable: "AI planning is temporarily unavailable.",
    incomplete: "The AI response was incomplete. Your saved plan is unchanged.",
  });
}
