// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "./home-client";

const fullPlan = {
  summary:
    "A practical celebration plan that keeps access, dietary needs, and a clear schedule in view.",
  budget: [
    {
      category: "Venue",
      amount: 500,
      tip: "Confirm step-free access and a weather-safe backup location.",
      color: "#728a67",
      spent: 0,
    },
    {
      category: "Food",
      amount: 300,
      tip: "Confirm dietary needs and label the dishes clearly for all guests.",
      color: "#d59a65",
      spent: 0,
    },
    {
      category: "Activities",
      amount: 200,
      tip: "Choose activities guests can join comfortably at their own pace.",
      color: "#cf8291",
      spent: 0,
    },
  ],
  timeline: Array.from({ length: 5 }, (_, index) => ({
    title: `Planning milestone ${index + 1}`,
    dueDate: "2026-11-20",
    priority: "Medium" as const,
    category: "Planning",
  })),
  vendors: [
    {
      category: "Venue",
      lookFor: "A step-free venue with quiet seating and an indoor backup area.",
      questions: ["Is the entrance step-free?", "What is the cancellation policy?"],
      dueDate: "2026-11-20",
    },
    {
      category: "Food",
      lookFor: "A caterer who labels ingredients and can confirm dietary requirements.",
      questions: ["Can you label each dish?", "When is the final guest count due?"],
      dueDate: "2026-11-20",
    },
  ],
  ideas: Array.from({ length: 3 }, (_, index) => ({
    area: "Accessibility",
    title: `Thoughtful idea ${index + 1}`,
    description: "Offer a welcoming option guests can choose at their own pace.",
    whyItFits: "This supports the access priority and makes participation comfortable.",
  })),
};

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("planner workspace", () => {
  it("creates an event and persists it after the page is rendered again", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Home />);

    await user.click(screen.getByRole("button", { name: "Plan an event" }));
    const dialog = screen.getByRole("dialog", { name: "Let’s make a plan" });
    await user.type(within(dialog).getByLabelText("Event name"), "Asha’s birthday");
    await user.selectOptions(within(dialog).getByLabelText("Celebration"), "Birthday");
    await user.click(within(dialog).getByRole("button", { name: "Create my plan" }));

    expect(await screen.findByRole("heading", { name: "Asha’s birthday" })).toBeInTheDocument();
    expect(window.localStorage.getItem("gatherwise.plans.v1")).toContain("Asha’s birthday");

    unmount();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "My events" }));
    expect(screen.getByText("Asha’s birthday")).toBeInTheDocument();
  });

  it("records overspending and keeps task and vendor edits in the workspace", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "Budget planner" }));
    await user.click(screen.getByRole("button", { name: "Add expense" }));
    const expenseDialog = screen.getByRole("dialog", { name: "Record an expense" });
    await user.type(within(expenseDialog).getByLabelText("Description"), "Venue deposit");
    await user.type(within(expenseDialog).getByLabelText("Amount (INR)"), "2000000");
    await user.click(within(expenseDialog).getByRole("button", { name: "Save expense" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("over this event’s total budget");

    await user.click(screen.getByRole("button", { name: "Timeline & vendors" }));
    await user.selectOptions(screen.getByLabelText("Venue vendor status"), "Booked");
    expect(screen.getByLabelText("Venue vendor status")).toHaveValue("Booked");
    await user.click(screen.getByLabelText("Complete: Book catering and confirm dietary needs"));
    expect(
      screen.getByLabelText("Mark incomplete: Book catering and confirm dietary needs"),
    ).toBeChecked();
  });

  it("shows provider errors without losing the saved event", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ error: "AI ideas are temporarily unavailable." }, 503));
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "Inspiration" }));
    await user.click(screen.getByRole("button", { name: "Ask Gemini" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "AI ideas are temporarily unavailable.",
    );
    expect(window.localStorage.getItem("gatherwise.plans.v1")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("generates and applies a validated full plan while preserving event state", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ plan: fullPlan }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "AI planning" }));
    await user.click(screen.getByRole("button", { name: "Generate my full plan" }));
    expect(await screen.findByText(fullPlan.summary)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Apply this plan" }));

    await user.click(screen.getByRole("button", { name: "Budget planner" }));
    expect(
      screen.getByRole("heading", { name: "Maya’s garden wedding budget" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/AI plan applied/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/plan",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("validates bad event submissions and then saves the corrected event", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "Plan an event" }));
    const dialog = screen.getByRole("dialog", { name: "Let’s make a plan" });
    await user.clear(within(dialog).getByLabelText("Event name"));
    await user.type(within(dialog).getByLabelText("Event name"), "A");
    await user.click(within(dialog).getByRole("button", { name: "Create my plan" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Too small: expected string to have >=2 characters",
    );

    await user.clear(within(dialog).getByLabelText("Event name"));
    await user.type(within(dialog).getByLabelText("Event name"), "Asha’s anniversary");
    await user.click(within(dialog).getByRole("button", { name: "Create my plan" }));
    expect(await screen.findByRole("heading", { name: "Asha’s anniversary" })).toBeInTheDocument();
  });

  it("adds expense and task through the real workspace forms", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "Budget planner" }));
    await user.click(screen.getByRole("button", { name: "Add expense" }));
    const expenseDialog = screen.getByRole("dialog", { name: "Record an expense" });
    await user.type(within(expenseDialog).getByLabelText("Description"), "Catering deposit");
    await user.type(within(expenseDialog).getByLabelText("Amount (INR)"), "25000");
    await user.click(within(expenseDialog).getByRole("button", { name: "Save expense" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Expense added");
    expect(screen.getAllByText("Recorded expenses").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Overview" }));
    await user.click(screen.getByRole("button", { name: "Add a task" }));
    const taskDialog = screen.getByRole("dialog", { name: "Add a planning task" });
    await user.type(within(taskDialog).getByLabelText("Task"), "Confirm quiet seating");
    await user.click(within(taskDialog).getByRole("button", { name: "Add task" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Task added to your plan");
    expect(screen.getByText("Confirm quiet seating")).toBeInTheDocument();
  });

  it("recovers from invalid task input and schedule updates", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "Add a task" }));
    const taskDialog = screen.getByRole("dialog", { name: "Add a planning task" });
    await user.type(within(taskDialog).getByLabelText("Task"), "A");
    await user.click(within(taskDialog).getByRole("button", { name: "Add task" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Too small: expected string to have >=2 characters",
    );
    await user.click(within(taskDialog).getByRole("button", { name: "Cancel" }));

    await user.click(screen.getByRole("button", { name: "Timeline & vendors" }));
    const time = screen.getAllByLabelText("Time for Venue access and setup check")[0];
    if (!time) throw new Error("The initial schedule time should be shown");
    await user.clear(time);
    await user.type(time, "invalid");
    expect(await screen.findByRole("status")).toHaveTextContent("schedule change is invalid");
  });

  it("reports invalid AI responses and preserves ideas after a failed refinement", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ideas: { theme: "incomplete" } }))
      .mockResolvedValueOnce(
        jsonResponse({
          ideas: {
            theme: "Garden celebration",
            overview: "A gentle garden party.",
            suggestions: [
              {
                title: "Welcome",
                detail: "Make arrivals easy for guests with clear signs and helpful volunteers.",
                category: "Accessibility",
                budgetFriendly: true,
              },
              {
                title: "Meal",
                detail: "Label every dish clearly and share ingredients with guests in advance.",
                category: "Food",
                budgetFriendly: false,
              },
              {
                title: "Ritual",
                detail: "Invite each guest to share a favorite memory with the couple.",
                category: "Activities",
                budgetFriendly: true,
              },
            ],
            contingency: "Move indoors to the confirmed backup room if rain begins.",
          },
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ error: "Refinement unavailable" }, 503));
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "Inspiration" }));
    await user.click(screen.getByRole("button", { name: "Ask Gemini" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("incomplete response");
    await user.click(screen.getByRole("button", { name: "Ask Gemini" }));
    expect(await screen.findByRole("heading", { name: "Garden celebration" })).toBeInTheDocument();
    const refinement = screen.getByLabelText("What would you like to adjust?");
    await user.type(refinement, "Make it simpler");
    await user.click(screen.getByRole("button", { name: "Refine these ideas" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Refinement unavailable");
    expect(screen.getByRole("heading", { name: "Garden celebration" })).toBeInTheDocument();
  });

  it("selects an event from search and shows the event workspace", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.type(screen.getByRole("textbox", { name: "Search plans" }), "Maya");
    expect(screen.getByRole("heading", { name: "Maya’s garden wedding" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Timeline & vendors" }));
    expect(
      screen.getByRole("heading", { name: "Timeline & vendor checklist" }),
    ).toBeInTheDocument();
  });

  it("cancels event creation and opens an event from the event list", async () => {
    const user = userEvent.setup();
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "Plan an event" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "My events" }));
    await user.click(screen.getByRole("button", { name: "Open event" }));
    expect(screen.getByRole("heading", { name: "Good morning, Priyanshu" })).toBeInTheDocument();
  });
});
