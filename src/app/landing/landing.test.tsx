// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { LandingAICallout } from "./LandingAICallout";
import { LandingFeatureSection } from "./LandingFeatureSection";
import { LandingFooter } from "./LandingFooter";
import { LandingHeader } from "./LandingHeader";
import { LandingHero } from "./LandingHero";

afterEach(cleanup);

describe("landing page sections", () => {
  it("exposes the product story, navigation, and feature list accessibly", () => {
    render(
      <>
        <LandingHeader />
        <main id="main">
          <LandingHero />
          <LandingFeatureSection />
          <LandingAICallout />
        </main>
        <LandingFooter />
      </>,
    );

    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main",
    );
    expect(screen.getByRole("navigation", { name: "Main navigation" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Make room for the moments that matter." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Sample plan · Maya’s garden wedding" }),
    ).toBeInTheDocument();
    expect(screen.getByText("₹18,00,000")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Everything in its place. Nothing set in stone." }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(
      screen.getByRole("heading", { name: "Good ideas. Grounded decisions." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(navigation).getByRole("link", { name: /Open planner/ })).toHaveAttribute(
      "href",
      "/planner",
    );
  });
});
