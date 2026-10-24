import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "GatherWise — Celebrate with a little more ease",
  description:
    "Plan weddings, birthdays, and community gatherings with a clear budget, practical timeline, vendor checklist, and optional AI suggestions.",
  applicationName: "GatherWise",
  openGraph: {
    title: "GatherWise — Celebrate with a little more ease",
    description:
      "A thoughtful workspace for event budgets, timelines, vendor research, and event-day plans.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
