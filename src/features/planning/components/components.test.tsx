// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { FormEvent } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDemoPlan } from "../demo-plan";
import type { EventIdeas } from "../schema";
import { AIPlanPanel } from "./AIPlanPanel";
import { BudgetPlannerView } from "./BudgetPlannerView";
import { EventFormDialog } from "./EventFormDialog";
import { EventListView } from "./EventListView";
import { ExpenseDialog } from "./ExpenseDialog";
import { InspirationView } from "./InspirationView";
import { OverviewView } from "./OverviewView";
import { RunOfShowSection } from "./RunOfShowSection";
import { TaskDialog } from "./TaskDialog";
import { TimelineAndVendorsView } from "./TimelineAndVendorsView";

vi.mock("../run-of-show-csv", () => ({
  downloadRunOfShowCsv: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const plan = createDemoPlan();

const validIdeas: EventIdeas = {
  theme: "A garden celebration",
  overview: "Use warm, thoughtful details to make the celebration easy to enjoy.",
  suggestions: [
    {
      title: "Welcome sign",
      detail: "Place a clear welcome sign next to the accessible path to the venue.",
      category: "Accessibility",
      budgetFriendly: true,
    },
    {
      title: "Seasonal meal",
      detail: "Choose a seasonal menu and label every dish for guests.",
      category: "Food",
      budgetFriendly: false,
    },
    {
      title: "Memory cards",
      detail: "Invite guests to leave a short memory for the couple.",
      category: "Activities",
      budgetFriendly: true,
    },
  ],
  contingency: "Move to a confirmed indoor space if the weather changes during the day.",
};

const validFullPlanResponse = {
  plan: {
    summary: "A practical draft keeps accessibility, dietary needs, and spending in view.",
    budget: ["Venue", "Food", "Activities"].map((category) => ({
      category,
      amount: 300,
      tip: "Confirm the details and compare the options before making a commitment.",
      color: "#728a67",
      spent: 0,
    })),
    timeline: Array.from({ length: 5 }, (_, index) => ({
      title: `Planning milestone ${index + 1}`,
      dueDate: "2026-11-20",
      priority: "Medium" as const,
      category: "Planning",
    })),
    vendors: ["Venue", "Food"].map((category) => ({
      category,
      lookFor: "A reliable option that can support the event’s stated access requirements.",
      questions: ["Can you confirm the details?", "What are the cancellation terms?"],
      dueDate: "2026-11-20",
    })),
    ideas: Array.from({ length: 3 }, (_, index) => ({
      area: "Accessibility",
      title: `Thoughtful idea ${index + 1}`,
      description: "Offer a clear, welcoming option guests can choose at their own pace.",
      whyItFits: "This supports the stated priorities and makes participation more comfortable.",
    })),
  },
};

describe("planning views", () => {
  it("shows empty and populated event lists and handles create and open actions", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    const onOpen = vi.fn();
    const { rerender } = render(<EventListView plans={[]} onCreate={onCreate} onOpen={onOpen} />);

    expect(screen.getByRole("heading", { name: "All your events" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Plan an event" }));
    expect(onCreate).toHaveBeenCalledOnce();

    rerender(<EventListView plans={[plan]} onCreate={onCreate} onOpen={onOpen} />);
    expect(screen.getByText(plan.request.name)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Open event" }));
    expect(onOpen).toHaveBeenCalledWith(plan.id);
  });

  it("summarizes normal and over-budget states and opens the expense flow", async () => {
    const user = userEvent.setup();
    const onAddExpense = vi.fn();
    const { rerender } = render(
      <BudgetPlannerView
        plan={plan}
        spent={0}
        remaining={plan.request.budget}
        onAddExpense={onAddExpense}
      />,
    );

    expect(screen.getByText("Remaining")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add expense" }));
    expect(onAddExpense).toHaveBeenCalledOnce();

    rerender(
      <BudgetPlannerView
        plan={plan}
        spent={2_000_000}
        remaining={-200_000}
        onAddExpense={onAddExpense}
      />,
    );
    expect(screen.getByText("Over budget")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("over this event’s total budget");
    expect(screen.getByText(/Step-free access/)).toBeInTheDocument();
  });

  it("renders idea loading, errors, suggestions, and refinement controls", async () => {
    const user = userEvent.setup();
    const onAsk = vi.fn();
    const onRefine = vi.fn();
    const onRefinementChange = vi.fn();
    const { rerender } = render(
      <InspirationView
        plan={plan}
        ideas={null}
        isLoading
        error="Provider unavailable"
        refinement=""
        onRefinementChange={onRefinementChange}
        onAskGemini={onAsk}
        onRefine={onRefine}
      />,
    );

    expect(screen.getByRole("button", { name: "Thinking…" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Provider unavailable");
    expect(screen.getByRole("link", { name: "Review Google’s terms" })).toBeInTheDocument();

    rerender(
      <InspirationView
        plan={plan}
        ideas={validIdeas}
        isLoading={false}
        error=""
        refinement=""
        onRefinementChange={onRefinementChange}
        onAskGemini={onAsk}
        onRefine={onRefine}
      />,
    );
    expect(screen.getByRole("heading", { name: validIdeas.theme })).toBeInTheDocument();
    expect(screen.getAllByText(/BUDGET CONSCIOUS/)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Refine these ideas" })).toBeDisabled();
    await user.type(screen.getByLabelText("What would you like to adjust?"), "Reduce the cost");
    expect(onRefinementChange).toHaveBeenCalled();
    rerender(
      <InspirationView
        plan={plan}
        ideas={validIdeas}
        isLoading={false}
        error=""
        refinement="Reduce the cost"
        onRefinementChange={onRefinementChange}
        onAskGemini={onAsk}
        onRefine={onRefine}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Refine these ideas" }));
    expect(onRefine).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Ask Gemini" }));
    expect(onAsk).toHaveBeenCalledOnce();
  });

  it("connects overview navigation, task updates, and task creation actions", async () => {
    const user = userEvent.setup();
    const onToggleTask = vi.fn();
    const onNavigate = vi.fn();
    const onAddTask = vi.fn();
    render(
      <OverviewView
        plan={plan}
        eventCount={1}
        completed={2}
        daysUntil={52}
        formattedEventDate="Saturday, 12 December 2026"
        onToggleTask={onToggleTask}
        onNavigate={onNavigate}
        onAddTask={onAddTask}
      />,
    );

    expect(screen.getByText(/33%/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "View event" }));
    expect(onNavigate).toHaveBeenCalledWith("My events");
    await user.click(screen.getByRole("button", { name: "Details" }));
    expect(onNavigate).toHaveBeenCalledWith("Budget planner");
    const firstTask = screen.getAllByRole("checkbox", { name: /Complete:/ })[0];
    if (!firstTask) throw new Error("A task should be available");
    await user.click(firstTask);
    expect(onToggleTask).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Add a task" }));
    expect(onAddTask).toHaveBeenCalledOnce();
  });

  it("shows neutral guidance when priorities and contingency are absent", () => {
    const sparsePlan = {
      ...plan,
      request: { ...plan.request, priorities: [] },
      budget: plan.budget.filter((item) => item.category !== "Contingency"),
    };
    render(
      <OverviewView
        plan={sparsePlan}
        eventCount={1}
        completed={0}
        daysUntil={52}
        formattedEventDate="Saturday, 12 December 2026"
        onToggleTask={vi.fn()}
        onNavigate={vi.fn()}
        onAddTask={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Add a few priorities to make every suggestion more personal."),
    ).toBeInTheDocument();
    expect(screen.getByText("₹0", { selector: ".budget-note strong" })).toBeInTheDocument();
  });

  it("edits run-of-show fields and exposes print and export actions", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
    const { downloadRunOfShowCsv } = await import("../run-of-show-csv");
    render(
      <RunOfShowSection eventName={plan.request.name} items={plan.runOfShow} onChange={onChange} />,
    );

    const activity = screen.getAllByLabelText("Activity")[0];
    if (!activity) throw new Error("Run of show should include an activity");
    await user.clear(activity);
    await user.type(activity, "Doors open");
    expect(onChange).toHaveBeenCalledWith(
      plan.runOfShow[0]?.id,
      "activity",
      "Venue access and setup checkD",
    );
    await user.click(screen.getByRole("button", { name: "Print plan" }));
    expect(print).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(downloadRunOfShowCsv).toHaveBeenCalledWith(plan.request.name, plan.runOfShow);
  });

  it("updates tasks and vendor statuses on the timeline", async () => {
    const user = userEvent.setup();
    const onToggleTask = vi.fn();
    const onVendorStatusChange = vi.fn();
    const onScheduleChange = vi.fn();
    render(
      <TimelineAndVendorsView
        plan={plan}
        completed={2}
        onToggleTask={onToggleTask}
        onVendorStatusChange={onVendorStatusChange}
        onScheduleChange={onScheduleChange}
      />,
    );

    const firstTask = screen.getAllByRole("checkbox", { name: /Complete:/ })[0];
    if (!firstTask) throw new Error("A task should be available");
    await user.click(firstTask);
    expect(onToggleTask).toHaveBeenCalledOnce();
    await user.selectOptions(screen.getByLabelText("Venue vendor status"), "Booked");
    expect(onVendorStatusChange).toHaveBeenCalledWith(plan.vendors[0]?.id, "Booked");
    const lead = screen.getAllByLabelText("Lead")[0];
    if (!lead) throw new Error("Run of show should include a lead");
    await user.clear(lead);
    await user.type(lead, "Priya");
    expect(onScheduleChange).toHaveBeenCalledWith(plan.runOfShow[0]?.id, "lead", "Event hostP");
  });
});

describe("accessible planning dialogs", () => {
  it("validates and submits every event field and closes on escape", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onClose = vi.fn();
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    const form = {
      name: "",
      type: "Wedding" as const,
      date: "2027-06-12",
      guests: "80",
      budget: "1200000",
      currency: "INR" as const,
      location: "Pune",
      priorities: "Step-free access",
    };
    render(
      <EventFormDialog
        form={form}
        error="Invalid request"
        onChange={onChange}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Let’s make a plan" });

    expect(within(dialog).getByRole("alert")).toHaveTextContent("Invalid request");
    await user.type(within(dialog).getByLabelText("Event name"), "Asha’s celebration");
    await user.selectOptions(within(dialog).getByLabelText("Celebration"), "Birthday");
    await user.clear(within(dialog).getByLabelText("Event date"));
    await user.type(within(dialog).getByLabelText("Event date"), "2027-07-20");
    await user.clear(within(dialog).getByLabelText("Guest estimate"));
    await user.type(within(dialog).getByLabelText("Guest estimate"), "45");
    await user.clear(within(dialog).getByLabelText("Budget (INR)"));
    await user.type(within(dialog).getByLabelText("Budget (INR)"), "900000");
    await user.selectOptions(within(dialog).getByLabelText("Event currency"), "USD");
    await user.clear(within(dialog).getByLabelText("Location"));
    await user.type(within(dialog).getByLabelText("Location"), "Mumbai");
    await user.clear(within(dialog).getByPlaceholderText("Step-free access, dietary needs…"));
    await user.type(
      within(dialog).getByPlaceholderText("Step-free access, dietary needs…"),
      "Quiet room",
    );
    expect(onChange).toHaveBeenCalled();
    fireEvent.submit(requireForm(dialog));
    expect(onSubmit).toHaveBeenCalledOnce();
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("edits a task and traps keyboard focus at the dialog boundary", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onClose = vi.fn();
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    render(
      <TaskDialog
        task={{ title: "", dueDate: "2026-11-01", priority: "Medium", category: "Planning" }}
        onChange={onChange}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Add a planning task" });
    const title = within(dialog).getByLabelText("Task");
    const close = within(dialog).getByRole("button", { name: "Close task dialog" });
    title.focus();
    close.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(within(dialog).getByRole("button", { name: "Add task" })).toHaveFocus();
    within(dialog).getByRole("button", { name: "Add task" }).focus();
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(close).toHaveFocus();
    await user.type(title, "Confirm venue access");
    await user.selectOptions(within(dialog).getByLabelText("Priority"), "High");
    await user.clear(within(dialog).getByLabelText("Category"));
    await user.type(within(dialog).getByLabelText("Category"), "Accessibility");
    expect(onChange).toHaveBeenCalled();
    fireEvent.submit(requireForm(dialog));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("submits expense data and closes from the backdrop", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    const onAmountChange = vi.fn();
    render(
      <ExpenseDialog
        plan={plan}
        category="Venue"
        description=""
        amount=""
        onCategoryChange={vi.fn()}
        onDescriptionChange={vi.fn()}
        onAmountChange={onAmountChange}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );
    const dialog = screen.getByRole("dialog", { name: "Record an expense" });
    await user.type(within(dialog).getByLabelText("Description"), "Venue deposit");
    await user.type(within(dialog).getByLabelText("Amount (INR)"), "25000");
    expect(onAmountChange).toHaveBeenCalled();
    fireEvent.submit(requireForm(dialog));
    expect(onSubmit).toHaveBeenCalledOnce();
    fireEvent.mouseDown(screen.getByRole("presentation"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes the task dialog when the user clicks its backdrop", () => {
    const onClose = vi.fn();
    render(
      <TaskDialog
        task={{ title: "", dueDate: "2026-10-24", priority: "Medium", category: "Planning" }}
        onChange={vi.fn()}
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.mouseDown(screen.getByRole("presentation"));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("keeps a generated plan reviewable when the request fails", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponseForComponent({ error: "AI unavailable" }, 503)),
    );
    render(
      <AIPlanPanel plan={plan} language="English" onLanguageChange={vi.fn()} onApply={onApply} />,
    );
    await user.click(screen.getByRole("button", { name: "Generate my full plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("AI unavailable");
    expect(onApply).not.toHaveBeenCalled();
  });

  it("reviews, refines, and applies a validated AI plan", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onLanguageChange = vi.fn();
    const fetchMock = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponseForComponent(validFullPlanResponse)));
    vi.stubGlobal("fetch", fetchMock);
    render(
      <AIPlanPanel
        plan={plan}
        language="English"
        onLanguageChange={onLanguageChange}
        onApply={onApply}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Plan language"), "Hindi");
    await user.click(screen.getByRole("button", { name: "Generate my full plan" }));
    expect(await screen.findByText(validFullPlanResponse.plan.summary)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("AI plan is ready to review");
    await user.type(screen.getByLabelText("Refine this plan"), "Keep the venue budget modest");
    await user.click(screen.getByRole("button", { name: "Refine AI plan" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Updated AI plan is ready");
    const refineBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
      feedback: string;
    };
    expect(refineBody.feedback).toBe("Keep the venue budget modest");
    await user.click(screen.getByRole("button", { name: "Apply this plan" }));
    expect(onApply).toHaveBeenCalledWith(validFullPlanResponse.plan);
    expect(onLanguageChange).toHaveBeenCalledWith("Hindi");
  });

  it("uses a safe fallback for malformed provider errors and rejected fetches", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponseForComponent("unstructured error", 502))
      .mockRejectedValueOnce("network failed");
    vi.stubGlobal("fetch", fetchMock);
    render(
      <AIPlanPanel plan={plan} language="English" onLanguageChange={vi.fn()} onApply={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "Generate my full plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "AI planning is temporarily unavailable.",
    );
    await user.click(screen.getByRole("button", { name: "Generate my full plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "AI planning is temporarily unavailable.",
    );
  });

  it("rejects a successful response that does not satisfy the plan contract", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponseForComponent({ plan: {} })));
    render(
      <AIPlanPanel plan={plan} language="English" onLanguageChange={vi.fn()} onApply={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: "Generate my full plan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The AI response was incomplete. Your saved plan is unchanged.",
    );
  });
});

function jsonResponseForComponent(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function requireForm(dialog: HTMLElement): HTMLFormElement {
  const form = dialog.querySelector("form");
  if (!form) throw new Error("Dialog form should be present");
  return form;
}
