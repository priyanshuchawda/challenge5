// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fullPlan, jsonResponse } from "../../tests/fixtures/home-client";
import { ideaRefinementRequestSchema } from "@/features/planning/schema";
import Home from "./home-client";

const validIdeas = {
  theme: "Garden celebration",
  overview: "A welcoming garden plan with a few practical details for guests.",
  suggestions: [
    {
      title: "Clear arrival",
      detail: "Use a visible welcome point and a clear path to seating for every arriving guest.",
      category: "Accessibility",
      budgetFriendly: true,
    },
    {
      title: "Seasonal menu",
      detail:
        "Ask the caterer to label ingredients and confirm the dietary needs collected from guests.",
      category: "Food",
      budgetFriendly: true,
    },
    {
      title: "Memory table",
      detail: "Invite guests to share a short memory at a quiet table near the gathering space.",
      category: "Activities",
      budgetFriendly: true,
    },
  ],
  contingency: "Move the gathering to the confirmed indoor room if rain begins.",
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("AI request and proposal flows", () => {
  it("shows provider errors without losing the saved event", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn<typeof fetch>()
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
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(jsonResponse({ plan: fullPlan }));
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

  it("sends existing suggestions for refinement and clears feedback after success", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ ideas: validIdeas }))
      .mockResolvedValueOnce(jsonResponse({ ideas: validIdeas }));
    vi.stubGlobal("fetch", fetchMock);
    render(<Home />);

    await user.click(screen.getByRole("button", { name: "Inspiration" }));
    await user.click(screen.getByRole("button", { name: "Ask Gemini" }));
    expect(await screen.findByRole("heading", { name: "Garden celebration" })).toBeInTheDocument();

    const feedback = screen.getByLabelText("What would you like to adjust?");
    await user.type(feedback, "Keep the total under budget");
    await user.click(screen.getByRole("button", { name: "Refine these ideas" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(feedback).toHaveValue(""));
    const requestOptions = fetchMock.mock.calls[1]?.[1];
    if (!requestOptions || typeof requestOptions.body !== "string") {
      throw new Error("Expected the refinement request to contain a JSON body.");
    }
    const refinementBody = ideaRefinementRequestSchema.parse(
      JSON.parse(requestOptions.body) as unknown,
    );
    expect(refinementBody.refinement).toBe("Keep the total under budget");
    expect(refinementBody.currentIdeas).toEqual(validIdeas);
  });
});
