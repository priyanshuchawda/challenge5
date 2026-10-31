import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/planner");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("core views pass axe accessibility checks at desktop and mobile sizes", async ({ page }) => {
  for (const [width, height] of [
    [1440, 1000],
    [390, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    for (const view of ["Overview", "Budget planner", "Timeline & vendors", "Inspiration"]) {
      await page.getByRole("button", { name: view, exact: true }).click();
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.map(({ id, impact, description }) => ({ id, impact, description })),
        `${view} at ${width}px`,
      ).toEqual([]);
    }
  }
});

test("serves baseline security headers on the app and AI API", async ({ page }) => {
  const pageResponse = await page.goto("/");
  expect(pageResponse?.headers()).toMatchObject({
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "strict-transport-security": "max-age=31536000; includeSubDomains",
  });
  expect(pageResponse?.headers()["x-powered-by"]).toBeUndefined();
  const apiResponse = await page.request.post("/api/ideas", { data: { invalid: true } });
  expect(apiResponse.status()).toBe(400);
  expect(apiResponse.headers()["x-content-type-options"]).toBe("nosniff");
  expect(apiResponse.headers()["x-frame-options"]).toBe("DENY");
});
