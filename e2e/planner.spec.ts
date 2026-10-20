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
  await expect(page.getByLabel("Description")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Record an expense" })).not.toBeVisible();
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

test("adds a custom planning task and keeps it after reload", async ({ page }) => {
  await page.getByRole("button", { name: /Add a task/i }).click();
  await expect(page.getByRole("dialog", { name: "Add a planning task" })).toBeVisible();
  await expect(page.getByLabel("Task", { exact: true })).toBeFocused();
  const dialogAccessibility = await new AxeBuilder({ page }).analyze();
  expect(dialogAccessibility.violations.map(({ id, nodes }) => ({ id, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) })), "Task dialog axe violations").toEqual([]);
  await page.getByLabel("Task", { exact: true }).fill("Confirm quiet seating area");
  await page.getByLabel("Category", { exact: true }).fill("Accessibility");
  await page.getByRole("button", { name: "Add task", exact: true }).click();
  await expect(page.getByText("Confirm quiet seating area")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Confirm quiet seating area")).toBeVisible();
  await expect(page.getByLabel("Complete: Confirm quiet seating area")).toBeVisible();
});

test("creates an event from the accessible dialog and retains it after reload", async ({ page }) => {
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

test("refines AI suggestions from an untrusted text request without changing saved event data", async ({ page }) => {
  const receivedBodies: unknown[] = [];
  await page.route("**/api/ideas", async (route) => {
    const body: unknown = route.request().postDataJSON();
    receivedBodies.push(body);
    const isRefinement = typeof body === "object" && body !== null && "refinement" in body;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ideas: {
        theme: isRefinement ? "A thoughtful low-cost birthday" : "A relaxed garden birthday",
        overview: "Use a few practical details to make the celebration feel personal and easy to enjoy.",
        suggestions: [
          { title: "Shared memory cards", detail: "Invite each guest to leave one short memory for the birthday host to read later.", category: "Activities", budgetFriendly: true },
          { title: "Seasonal potluck table", detail: "Coordinate a simple shared menu and label dishes for guests with different dietary needs.", category: "Food", budgetFriendly: true },
          { title: "Quiet seating corner", detail: "Set aside a calm seating area away from the main activity for guests who want a break.", category: "Accessibility", budgetFriendly: true },
        ],
        contingency: "Move the gathering to a confirmed indoor space if the weather changes unexpectedly.",
      } }),
    });
  });

  await page.getByRole("button", { name: "Inspiration", exact: true }).click();
  await page.getByRole("button", { name: "Ask Gemini" }).click();
  await expect(page.getByRole("heading", { name: "A relaxed garden birthday" })).toBeVisible();
  const savedBudget = await page.evaluate(() => localStorage.getItem("gatherwise.plans.v1"));
  await page.getByLabel("What would you like to adjust?").fill("Make it lower cost and keep the quiet seating area");
  await page.getByRole("button", { name: "Refine these ideas" }).click();
  await expect(page.getByRole("heading", { name: "A thoughtful low-cost birthday" })).toBeVisible();
  expect(receivedBodies).toHaveLength(2);
  expect(receivedBodies[1]).toMatchObject({
    refinement: "Make it lower cost and keep the quiet seating area",
    currentIdeas: { theme: "A relaxed garden birthday" },
  });
  await expect.poll(() => page.evaluate(() => localStorage.getItem("gatherwise.plans.v1"))).toBe(savedBudget);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.map(({ id }) => id)).toEqual([]);
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
