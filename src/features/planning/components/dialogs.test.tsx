// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { FormEvent } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  jsonResponseForComponent,
  plan,
  requireForm,
  validFullPlanResponse,
} from "../../../../tests/fixtures/planning-components";
import { AIPlanPanel } from "./AIPlanPanel";
import { EventFormDialog } from "./EventFormDialog";
import { ExpenseDialog } from "./ExpenseDialog";
import { TaskDialog } from "./TaskDialog";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
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
