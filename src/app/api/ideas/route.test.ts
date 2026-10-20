import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/ideas", () => {
  it("rejects invalid event context before using an AI quota", async () => {
    const response = await POST(new Request("http://localhost/api/ideas", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ guests: -3 }),
    }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Check the event details and try again." });
  });

  it("rejects oversized request bodies", async () => {
    const response = await POST(new Request("http://localhost/api/ideas", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ data: "x".repeat(9_000) }),
    }));
    expect(response.status).toBe(413);
  });
});
