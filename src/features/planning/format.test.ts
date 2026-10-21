import { describe, expect, it } from "vitest";
import { formatDate, formatMoney } from "./format";

describe("planning display formatting", () => {
  it("formats whole rupee amounts with Indian grouping", () => {
    expect(formatMoney(1_800_000)).toBe("₹18,00,000");
  });

  it("formats event budgets in the selected currency and locale", () => {
    expect(formatMoney(2_500, "USD")).toBe("$2,500");
    expect(formatMoney(2_500, "GBP")).toBe("£2,500");
  });

  it("formats an ISO date without shifting the event day", () => {
    expect(formatDate("2027-06-12", { day: "numeric", month: "long", year: "numeric" })).toBe("12 June 2027");
  });
});
