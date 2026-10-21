import { expect, test } from "@playwright/test";

test("serves the app with a per-response CSP nonce and no browser policy violations", async ({
  page,
}) => {
  const policyErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /content security policy/i.test(message.text()))
      policyErrors.push(message.text());
  });

  const response = await page.goto("/");
  const policy = response?.headers()["content-security-policy"] ?? "";

  expect(response?.status()).toBe(200);
  expect(policy).toContain("default-src 'self'");
  expect(policy).toMatch(/script-src[^;]*'nonce-[^']+'/);
  expect(policy).toContain("'strict-dynamic'");
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("frame-ancestors 'none'");
  await expect(page.getByRole("heading", { name: "Maya’s garden wedding" })).toBeVisible();

  await page.getByRole("button", { name: "Plan an event" }).first().click();
  await expect(page.getByRole("dialog", { name: "Let’s make a plan" })).toBeVisible();
  await page.waitForTimeout(300);
  expect(policyErrors).toEqual([]);
});
