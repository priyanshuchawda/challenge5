import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("creates an expense, warns on overspend, and retains vendor and schedule edits", async ({ page }) => {
  await page.getByRole("button", { name: "Budget planner", exact: true }).click();
  await page.getByRole("button", { name: /Add expense/i }).click();
  await page.getByLabel("Description").fill("Venue deposit");
  await page.getByLabel("Amount (INR)").fill("2000000");
  await page.getByRole("button", { name: /Save expense/i }).click();
  await expect(page.getByRole("alert").filter({ hasText: "over this event’s total budget" })).toBeVisible();

  await page.getByRole("button", { name: "Timeline & vendors", exact: true }).click();
  await page.getByLabel("Venue vendor status").selectOption("Booked");
  await page.getByLabel("Activity", { exact: true }).first().fill("Doors open");
  await page.getByLabel("Time for Doors open").fill("08:45");
  await page.reload();
  await page.getByRole("button", { name: "Timeline & vendors", exact: true }).click();
  await expect(page.getByLabel("Venue vendor status")).toHaveValue("Booked");
  await expect(page.getByLabel("Time for Doors open")).toHaveValue("08:45");
});

test("exports the run of show as CSV and exposes print mode", async ({ page }) => {
  await page.getByRole("button", { name: "Timeline & vendors", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /Export CSV/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("run-of-show.csv");
  await page.emulateMedia({ media: "print" });
  const printVisible = await page.locator(".run-of-show-table").evaluate((element) => getComputedStyle(element).display !== "none");
  expect(printVisible).toBe(true);
});

test("core views pass axe accessibility checks at desktop and mobile sizes", async ({ page }) => {
  for (const [width, height] of [[1440, 1000], [390, 844]] as const) {
    await page.setViewportSize({ width, height });
    for (const view of ["Overview", "Budget planner", "Timeline & vendors", "Inspiration"]) {
      await page.getByRole("button", { name: view, exact: true }).click();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.map(({ id, impact, description }) => ({ id, impact, description })), `${view} at ${width}px`).toEqual([]);
    }
  }
});
