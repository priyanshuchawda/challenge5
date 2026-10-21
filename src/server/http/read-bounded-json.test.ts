import { describe, expect, it } from "vitest";
import { readBoundedJson } from "./read-bounded-json";

function requestWithBody(body: ReadableStream<Uint8Array> | null): Request {
  return { body } as Request;
}

describe("bounded JSON request reader", () => {
  it("parses valid JSON without relying on content-length", async () => {
    const body = new TextEncoder().encode('{"city":"Pune"}');
    await expect(readBoundedJson(requestWithBody(new ReadableStream({ start(controller) { controller.enqueue(body); controller.close(); } })), body.byteLength))
      .resolves.toEqual({ ok: true, value: { city: "Pune" } });
  });

  it("counts UTF-8 bytes and stops when a streamed body exceeds its limit", async () => {
    const chunks = [new TextEncoder().encode('{"name":"'), new TextEncoder().encode("雪"), new TextEncoder().encode('"}')];
    let cancelled = false;
    let index = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        const chunk = chunks[index++];
        if (chunk) controller.enqueue(chunk);
        else controller.close();
      },
      cancel() { cancelled = true; },
    });
    await expect(readBoundedJson(requestWithBody(stream), 11)).resolves.toEqual({ ok: false, status: 413 });
    expect(cancelled).toBe(true);

    const rejectingCancel = new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(new Uint8Array(8)); },
      cancel() { return Promise.reject(new Error("cancel details")); },
    });
    await expect(readBoundedJson(requestWithBody(rejectingCancel), 4)).resolves.toEqual({ ok: false, status: 413 });
  });

  it("returns a controlled error for invalid JSON, stream failure, and missing bodies", async () => {
    const invalid = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode("{")); controller.close(); } });
    const failed = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new Error("stream details")); } });
    await expect(readBoundedJson(requestWithBody(invalid), 16)).resolves.toEqual({ ok: false, status: 400 });
    await expect(readBoundedJson(requestWithBody(failed), 16)).resolves.toEqual({ ok: false, status: 400 });
    await expect(readBoundedJson(requestWithBody(null), 16)).resolves.toEqual({ ok: false, status: 400 });
    await expect(readBoundedJson(requestWithBody(invalid), 0)).resolves.toEqual({ ok: false, status: 400 });
  });
});
