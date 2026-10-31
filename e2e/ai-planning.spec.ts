import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { plansSchema } from "../src/features/planning/schema";

test.beforeEach(async ({ page }) => {
  await page.goto("/planner");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("refines AI suggestions from an untrusted text request without changing saved event data", async ({
  page,
}) => {
  const receivedBodies: unknown[] = [];
  await page.route("**/api/ideas", async (route) => {
    const body: unknown = route.request().postDataJSON();
    receivedBodies.push(body);
    const isRefinement = typeof body === "object" && body !== null && "refinement" in body;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ideas: {
          theme: isRefinement ? "A thoughtful low-cost birthday" : "A relaxed garden birthday",
          overview:
            "Use a few practical details to make the celebration feel personal and easy to enjoy.",
          suggestions: [
            {
              title: "Shared memory cards",
              detail:
                "Invite each guest to leave one short memory for the birthday host to read later.",
              category: "Activities",
              budgetFriendly: true,
            },
            {
              title: "Seasonal potluck table",
              detail:
                "Coordinate a simple shared menu and label dishes for guests with different dietary needs.",
              category: "Food",
              budgetFriendly: true,
            },
            {
              title: "Quiet seating corner",
              detail:
                "Set aside a calm seating area away from the main activity for guests who want a break.",
              category: "Accessibility",
              budgetFriendly: true,
            },
          ],
          contingency:
            "Move the gathering to a confirmed indoor space if the weather changes unexpectedly.",
        },
      }),
    });
  });

  await page.getByRole("button", { name: "Inspiration", exact: true }).click();
  await page.getByRole("button", { name: "Ask Gemini" }).click();
  await expect(page.getByRole("heading", { name: "A relaxed garden birthday" })).toBeVisible();
  const savedBudget = await page.evaluate(() => localStorage.getItem("gatherwise.plans.v1"));
  await page
    .getByLabel("What would you like to adjust?")
    .fill("Make it lower cost and keep the quiet seating area");
  await page.getByRole("button", { name: "Refine these ideas" }).click();
  await expect(page.getByRole("heading", { name: "A thoughtful low-cost birthday" })).toBeVisible();
  expect(receivedBodies).toHaveLength(2);
  expect(receivedBodies[1]).toMatchObject({
    refinement: "Make it lower cost and keep the quiet seating area",
    currentIdeas: { theme: "A relaxed garden birthday" },
  });
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("gatherwise.plans.v1")))
    .toBe(savedBudget);
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.map(({ id }) => id)).toEqual([]);
});

test("generates, refines, and applies a full AI plan while preserving completed tasks and actual expenses", async ({
  page,
}) => {
  const requests: Record<string, unknown>[] = [];
  let call = 0;
  await page.route("**/api/plan", async (route) => {
    requests.push(route.request().postDataJSON() as Record<string, unknown>);
    call += 1;
    const plan = {
      summary:
        call === 1
          ? "A practical, accessible celebration plan."
          : "A lower-cost plan with access needs retained.",
      budget: [
        {
          category: "Venue",
          amount: 900000,
          percent: 50,
          color: "#728a67",
          spent: 0,
          tip: "Confirm step-free access and clear cancellation terms.",
        },
        {
          category: "Food & drink",
          amount: 600000,
          percent: 33.3,
          color: "#d59a65",
          spent: 0,
          tip: "Label dishes and confirm dietary accommodations.",
        },
        {
          category: "Accessibility",
          amount: 300000,
          percent: 16.7,
          color: "#cf8291",
          spent: 0,
          tip: "Keep a contingency for access arrangements.",
        },
      ],
      timeline: [
        {
          title: "Confirm accessible venue",
          dueDate: "2026-10-30",
          priority: "High",
          category: "Venue",
        },
        {
          title: call === 1 ? "Confirm dietary menu" : "Compare inclusive menu options",
          dueDate: "2026-11-01",
          priority: "Medium",
          category: "Food & drink",
        },
        {
          title: "Send accessible invitations",
          dueDate: "2026-11-02",
          priority: "High",
          category: "Guests",
        },
        {
          title: "Prepare the welcome area",
          dueDate: "2026-11-03",
          priority: "Medium",
          category: "Accessibility",
        },
        {
          title: "Confirm the event schedule",
          dueDate: "2026-11-04",
          priority: "Low",
          category: "Schedule",
        },
      ],
      vendors: [
        {
          category: "Venue",
          lookFor: "Step-free garden venue with accessible restrooms",
          questions: ["Is the route step-free?", "Are accessible restrooms available?"],
          dueDate: "2026-10-25",
        },
        {
          category: "Food & drink",
          lookFor: "Caterer with clear dietary labeling",
          questions: ["Can dishes be labeled?", "Can you support vegetarian meals?"],
          dueDate: "2026-10-26",
        },
      ],
      ideas: [
        {
          area: "Accessibility",
          title: "Quiet seating corner",
          description:
            "Set aside a calm area away from the music for guests who need a quiet break.",
          whyItFits: "It supports guests who benefit from a quieter place during the celebration.",
        },
        {
          area: "Food",
          title: "Clearly labeled menu",
          description: "Mark vegetarian dishes and common allergens at the buffet.",
          whyItFits: "Clear labels help guests choose food that fits their dietary needs.",
        },
        {
          area: "Activity",
          title: "Shared memory cards",
          description: "Invite each guest to write one short memory for the host.",
          whyItFits: "It creates a meaningful, low-cost activity for guests of all ages.",
        },
      ],
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ plan }),
    });
  });

  await page.getByRole("button", { name: "Budget planner", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Budget planner" })).toBeVisible();
  await page.getByRole("button", { name: /Add expense/i }).click();
  await page.getByLabel("Description").fill("Venue deposit");
  await page.getByLabel("Amount (INR)").fill("25000");
  await page.getByRole("button", { name: /Save expense/i }).click();
  const beforeStorage = await page.evaluate(() => localStorage.getItem("gatherwise.plans.v1"));
  const before = plansSchema.parse(JSON.parse(beforeStorage ?? "[]") as unknown).at(0);
  if (!before) throw new Error("Expected the event plan to be saved before applying AI changes.");
  const completedBefore = before.tasks
    .filter((task: { completed: boolean }) => task.completed)
    .map((task: { title: string }) => task.title);
  const expensesBefore = before.expenses;

  await page.getByRole("button", { name: "AI planning", exact: true }).click();
  await page.getByLabel("Plan language").selectOption("Hindi");
  await page.getByRole("button", { name: "Generate my full plan" }).click();
  await expect(page.getByText("A practical, accessible celebration plan.")).toBeVisible();
  expect(requests[0]).toMatchObject({
    eventType: "Wedding",
    guestCount: 96,
    currency: "INR",
    language: "Hindi",
  });
  await page
    .getByLabel("Refine this plan")
    .fill("Lower food costs but keep dietary accommodations");
  await page.getByRole("button", { name: "Refine AI plan" }).click();
  await expect(page.getByText("A lower-cost plan with access needs retained.")).toBeVisible();
  expect(requests[1]).toMatchObject({
    language: "Hindi",
    feedback: "Lower food costs but keep dietary accommodations",
    previousPlan: { summary: "A practical, accessible celebration plan." },
  });

  await page.getByRole("button", { name: "Apply this plan" }).click();
  const afterStorage = await page.evaluate(() => localStorage.getItem("gatherwise.plans.v1"));
  const after = plansSchema.parse(JSON.parse(afterStorage ?? "[]") as unknown).at(0);
  if (!after) throw new Error("Expected the event plan to remain saved after applying AI changes.");
  expect(after.expenses).toEqual(expensesBefore);
  expect(
    after.tasks
      .filter((task: { completed: boolean }) => task.completed)
      .map((task: { title: string }) => task.title),
  ).toEqual(completedBefore);
  expect(
    after.tasks.some((task: { title: string }) => task.title === "Compare inclusive menu options"),
  ).toBe(true);
  expect(
    after.budget.reduce((total: number, item: { amount: number }) => total + item.amount, 0),
  ).toBe(after.request.budget);
  expect(after.budget.find((item: { category: string }) => item.category === "Venue")?.spent).toBe(
    25000,
  );
  const firstVendor = after.vendors.at(0);
  if (!firstVendor) throw new Error("Expected the applied AI plan to include a vendor.");
  expect(firstVendor.status).toBe("Researching");
  await page.reload();
  await expect(page.getByRole("button", { name: "AI planning", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Timeline & vendors", exact: true }).click();
  await expect(page.getByText("Compare inclusive menu options")).toBeVisible();
});
