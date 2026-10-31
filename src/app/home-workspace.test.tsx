// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Home from "./home-client";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe("workspace edits and validation", () => {
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
});
