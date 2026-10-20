import { afterEach, describe, expect, it, vi } from "vitest";
import { createRunOfShowCsv, createRunOfShowFilename, downloadRunOfShowCsv } from "./run-of-show-csv";
import type { RunOfShowItem } from "./schema";

const items: RunOfShowItem[] = [{
  id: "schedule-1", time: "09:00", activity: 'Welcome, "everyone"', lead: "Host", location: "Pune", notes: "Water and seating",
}];

describe("run-of-show CSV export", () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it("writes a UTF-8 BOM, stable headers, CRLF rows, and escaped cell values", () => {
    expect(createRunOfShowCsv(items)).toBe('\uFEFF"time","activity","lead","location","notes"\r\n"09:00","Welcome, ""everyone""","Host","Pune","Water and seating"');
  });

  it("creates a safe filename and falls back for names without ASCII characters", () => {
    expect(createRunOfShowFilename("Maya’s Garden Wedding!")).toBe("maya-s-garden-wedding-run-of-show.csv");
    expect(createRunOfShowFilename("日本語")).toBe("event-run-of-show.csv");
  });

  it("downloads the generated file and releases its object URL", () => {
    const click = vi.fn();
    const anchor = { href: "", download: "", click };
    vi.stubGlobal("document", { createElement: vi.fn(() => anchor) });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:gatherwise");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    downloadRunOfShowCsv("Garden Party", items);

    expect(anchor.download).toBe("garden-party-run-of-show.csv");
    expect(anchor.href).toBe("blob:gatherwise");
    expect(click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:gatherwise");
  });

});
