// @vitest-environment jsdom

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { jsonResponse } from "../../../../tests/fixtures/home-client";
import { plan } from "../../../../tests/fixtures/planning-components";
import { useEventIdeas } from "./useEventIdeas";

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useEventIdeas request lifecycle", () => {
  it("ignores an aborted request while a newer request remains active", async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useEventIdeas());
    let firstRequest!: Promise<void>;
    let secondRequest!: Promise<void>;

    act(() => {
      firstRequest = result.current.requestIdeas(plan);
      secondRequest = result.current.requestIdeas(plan);
    });
    first.reject(new DOMException("Request superseded", "AbortError"));
    await act(async () => firstRequest);

    expect(result.current.error).toBe("");
    expect(result.current.isLoading).toBe(true);

    second.resolve(jsonResponse({ ideas: { theme: "unused" } }));
    await act(async () => secondRequest);

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toContain("incomplete response");
  });

  it("converts non-Error provider failures into a safe user message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue("unexpected rejection"));
    const { result } = renderHook(() => useEventIdeas());

    await act(async () => result.current.requestIdeas(plan));

    expect(result.current.error).toBe("AI ideas are temporarily unavailable.");
    expect(result.current.isLoading).toBe(false);
  });
});
