import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GatherWise — Celebrate with a little more ease",
  description: "An thoughtful, practical event planning workspace for celebrations that matter.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
