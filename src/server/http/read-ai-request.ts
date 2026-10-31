import { NextResponse } from "next/server";
import { readBoundedJson } from "./read-bounded-json";

export type AIRequestBody = { ok: true; value: unknown } | { ok: false; response: NextResponse };

export async function readAIRequestBody(
  request: Request,
  byteLimit: number,
): Promise<AIRequestBody> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > byteLimit) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Request is too large." }, { status: 413 }),
    };
  }

  const body = await readBoundedJson(request, byteLimit);
  if (!body.ok) {
    const message =
      body.status === 413 ? "Request is too large." : "Request must contain valid JSON.";
    return {
      ok: false,
      response: NextResponse.json({ error: message }, { status: body.status }),
    };
  }
  return { ok: true, value: body.value };
}
