// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Home from "./home-client";

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(cleanup);

describe("event creation and selection", () => {
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
