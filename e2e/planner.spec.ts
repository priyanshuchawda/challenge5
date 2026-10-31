import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/planner");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test.beforeEach(async ({ page }) => {
  await page.goto("/planner");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("landing page explains the product and routes into the planner", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Make room for the moments that matter.",
  );
  await expect(page.getByRole("link", { name: "Start planning" })).toHaveAttribute(
    "href",
    "/planner",
  );
  const desktopA11y = await new AxeBuilder({ page }).analyze();
  expect(
    desktopA11y.violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    })),
  ).toEqual([]);

  await page.getByRole("link", { name: "Start planning" }).click();
  await expect(page).toHaveURL(/\/planner$/);
  await expect(page.getByRole("heading", { name: "Good morning, Priyanshu" })).toBeVisible();

  await page.goto("/");
  await page.setViewportSize({ width: 375, height: 812 });
  const mobileA11y = await new AxeBuilder({ page }).analyze();
  expect(mobileA11y.violations.map(({ id }) => id)).toEqual([]);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 375);
});

test("creates an expense, warns on overspend, and retains vendor and schedule edits", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Budget planner", exact: true }).click();
  await page.getByRole("button", { name: /Add expense/i }).click();
  await expect(page.getByLabel("Description")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Record an expense" })).not.toBeVisible();
  await page.getByRole("button", { name: /Add expense/i }).click();
  await page.getByLabel("Description").fill("Venue deposit");
  await page.getByLabel("Amount (INR)").fill("2000000");
  await page.getByRole("button", { name: /Save expense/i }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "over this event’s total budget" }),
  ).toBeVisible();

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
  const printVisible = await page
    .locator(".run-of-show-table")
    .evaluate((element) => getComputedStyle(element).display !== "none");
  expect(printVisible).toBe(true);
});

test("adds a custom planning task and keeps it after reload", async ({ page }) => {
  await page.getByRole("button", { name: /Add a task/i }).click();
  await expect(page.getByRole("dialog", { name: "Add a planning task" })).toBeVisible();
  await expect(page.getByLabel("Task", { exact: true })).toBeFocused();
  const dialogAccessibility = await new AxeBuilder({ page }).analyze();
  expect(
    dialogAccessibility.violations.map(({ id, nodes }) => ({
      id,
      nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })),
    })),
    "Task dialog axe violations",
  ).toEqual([]);
  await page.getByLabel("Task", { exact: true }).fill("Confirm quiet seating area");
  await page.getByLabel("Category", { exact: true }).fill("Accessibility");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(page.getByText("Confirm quiet seating area")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Confirm quiet seating area")).toBeVisible();
  await expect(page.getByLabel("Complete: Confirm quiet seating area")).toBeVisible();
});

test("creates an event from the accessible dialog and retains it after reload", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Plan an event" }).first().click();
  await expect(page.getByRole("dialog", { name: "Let’s make a plan" })).toBeVisible();
  await expect(page.getByLabel("Event name")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Let’s make a plan" })).not.toBeVisible();
  await page.getByRole("button", { name: "Plan an event" }).first().click();
  await page.getByLabel("Event name").fill("Anika’s 30th birthday");
  await page.getByLabel("Celebration").selectOption("Birthday");
  await page.getByRole("button", { name: "Create my plan" }).click();
  await expect(page.getByRole("heading", { name: "Anika’s 30th birthday" })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "My events" }).click();
  await expect(page.getByText("Anika’s 30th birthday")).toBeVisible();
});
