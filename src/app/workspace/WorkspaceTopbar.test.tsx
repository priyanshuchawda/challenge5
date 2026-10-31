// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDemoPlan } from "@/features/planning/demo-plan";
import { WorkspaceTopbar } from "./WorkspaceTopbar";

afterEach(cleanup);

describe("workspace plan search", () => {
  it("selects a matching plan case-insensitively and ignores surrounding spaces", () => {
    const onSelectPlan = vi.fn();
    render(
      <WorkspaceTopbar view="Overview" plans={[createDemoPlan()]} onSelectPlan={onSelectPlan} />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Search plans" }), {
      target: { value: "  MAYA’S GARDEN  " },
    });

    expect(onSelectPlan).toHaveBeenCalledExactlyOnceWith("demo-wedding");
  });

  it("does not change the selected plan when no plan matches", () => {
    const onSelectPlan = vi.fn();
    render(
      <WorkspaceTopbar view="Overview" plans={[createDemoPlan()]} onSelectPlan={onSelectPlan} />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Search plans" }), {
      target: { value: "graduation" },
    });

    expect(onSelectPlan).not.toHaveBeenCalled();
  });

  it("ignores an empty query after trimming whitespace", () => {
    const onSelectPlan = vi.fn();
    render(
      <WorkspaceTopbar view="Overview" plans={[createDemoPlan()]} onSelectPlan={onSelectPlan} />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Search plans" }), {
      target: { value: "   " },
    });

    expect(onSelectPlan).not.toHaveBeenCalled();
  });
});
