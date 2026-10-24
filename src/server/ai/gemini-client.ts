import { createHash } from "node:crypto";
import { z } from "zod";

const DEFAULT_PRIMARY_MODEL = "gemini-3.5-flash-lite";
const DEFAULT_FALLBACK_MODEL = "gemini-3.8-flash";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_IN_FLIGHT_REQUESTS = 128;
const inFlightRequests = new Map<string, Promise<unknown>>();

export type GeminiErrorStatus = "unavailable" | "quota" | "invalid_output";

export class GeminiError extends Error {
  constructor(
    readonly status: GeminiErrorStatus,
    readonly httpStatus?: number,
    options?: ErrorOptions,
  ) {
    super(status, options);
    this.name = "GeminiError";
  }
}

interface GeminiJsonRequest<T> {
  systemInstruction: string;
  prompt: string;
  responseSchema: Record<string, unknown>;
  outputSchema: z.ZodType<T>;
  temperature: number;
  maxOutputTokens: number;
}

function generatedText(value: unknown): string {
  const parsed = z
    .object({
      candidates: z.array(
        z
          .object({
            content: z
              .object({
                parts: z.array(z.object({ text: z.string().optional() }).passthrough()),
              })
              .passthrough(),
          })
          .passthrough(),
      ),
    })
    .passthrough()
    .safeParse(value);

  if (!parsed.success) throw new GeminiError("invalid_output");
  const text = parsed.data.candidates[0]?.content.parts.find(
    (part) => typeof part.text === "string",
  )?.text;
  if (!text) throw new GeminiError("invalid_output");
  return text;
}

function parseGeneratedJson<T>(text: string, schema: z.ZodType<T>): T {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new GeminiError("invalid_output");
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) throw new GeminiError("invalid_output");
  return parsed.data;
}

function shouldUseFallback(error: unknown): error is GeminiError {
  return (
    error instanceof GeminiError &&
    (error.status === "invalid_output" ||
      (error.status === "unavailable" &&
        (error.httpStatus === undefined || error.httpStatus >= 500)))
  );
}

async function requestModel<T>(
  model: string,
  apiKey: string,
  request: GeminiJsonRequest<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.systemInstruction }] },
          contents: [{ role: "user", parts: [{ text: request.prompt }] }],
          generationConfig: {
            temperature: request.temperature,
            maxOutputTokens: request.maxOutputTokens,
            responseMimeType: "application/json",
            responseSchema: request.responseSchema,
          },
        }),
      },
    );

    if (response.status === 429) throw new GeminiError("quota", response.status);
    if (!response.ok) throw new GeminiError("unavailable", response.status);

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new GeminiError("invalid_output");
    }

    return parseGeneratedJson(generatedText(body), request.outputSchema);
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    throw new GeminiError("unavailable", undefined, { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateGeminiJson<T>(request: GeminiJsonRequest<T>): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError("unavailable");

  const primaryModel = process.env.GEMINI_MODEL || DEFAULT_PRIMARY_MODEL;
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
  const key = createHash("sha256")
    .update(JSON.stringify({ primaryModel, fallbackModel, request }))
    .digest("hex");
  const existing = inFlightRequests.get(key);
  if (existing) return existing as Promise<T>;

  const generation = (async () => {
    try {
      return await requestModel(primaryModel, apiKey, request);
    } catch (error) {
      if (!shouldUseFallback(error) || fallbackModel === primaryModel) throw error;
      return requestModel(fallbackModel, apiKey, request);
    }
  })();

  if (inFlightRequests.size >= MAX_IN_FLIGHT_REQUESTS) return generation;
  inFlightRequests.set(key, generation);
  try {
    return await generation;
  } finally {
    if (inFlightRequests.get(key) === generation) inFlightRequests.delete(key);
  }
}
