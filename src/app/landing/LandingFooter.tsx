import Link from "next/link";
import { ClipboardList } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <Link className="landing-brand" href="/">
        GatherWise
      </Link>
      <span>Plan with care. Celebrate together.</span>
      <Link href="/planner">
        <ClipboardList size={15} /> Open your workspace
      </Link>
    </footer>
  );
}
