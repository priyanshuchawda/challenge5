// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { plan, validIdeas } from "../../../../tests/fixtures/planning-components";
import { BudgetPlannerView } from "./BudgetPlannerView";
import { EventListView } from "./EventListView";
import { InspirationView } from "./InspirationView";
import { OverviewView } from "./OverviewView";
import { RunOfShowSection } from "./RunOfShowSection";
import { TimelineAndVendorsView } from "./TimelineAndVendorsView";

vi.mock("../run-of-show-csv", () => ({
  downloadRunOfShowCsv: vi.fn(),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

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
