import type { RunOfShowItem } from "./schema";

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function createRunOfShowCsv(items: RunOfShowItem[]): string {
  const rows = [
    ["time", "activity", "lead", "location", "notes"],
    ...items.map(({ time, activity, lead, location, notes }) => [time, activity, lead, location, notes]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function createRunOfShowFilename(eventName: string): string {
  const slug = eventName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "event"}-run-of-show.csv`;
}

export function downloadRunOfShowCsv(eventName: string, items: RunOfShowItem[]): void {
  const url = URL.createObjectURL(new Blob([createRunOfShowCsv(items)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = createRunOfShowFilename(eventName);
  link.click();
  URL.revokeObjectURL(url);
}
