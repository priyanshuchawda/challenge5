export type BoundedJsonResult = { ok: true; value: unknown } | { ok: false; status: 400 | 413 };

/** Reads a JSON request without buffering more than the route's byte budget. */
export async function readBoundedJson(
  request: Request,
  byteLimit: number,
): Promise<BoundedJsonResult> {
  if (!request.body || !Number.isSafeInteger(byteLimit) || byteLimit < 1)
    return { ok: false, status: 400 };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > byteLimit) {
        void reader.cancel().catch(() => undefined);
        return { ok: false, status: 413 };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    try {
      return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
    } catch {
      return { ok: false, status: 400 };
    }
  } catch {
    return { ok: false, status: 400 };
  } finally {
    reader.releaseLock();
  }
}
