import { Search } from "lucide-react";
import type { EventPlan } from "@/features/planning/schema";
import type { PlannerView } from "./PlannerSidebar";

interface WorkspaceTopbarProps {
  view: PlannerView;
  plans: EventPlan[];
  onSelectPlan: (planId: string) => void;
}

export function WorkspaceTopbar({ view, plans, onSelectPlan }: WorkspaceTopbarProps) {
  function searchPlans(query: string) {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return;
    const matchingPlan = plans.find((plan) =>
      plan.request.name.toLocaleLowerCase().includes(normalizedQuery),
    );
    if (matchingPlan) onSelectPlan(matchingPlan.id);
  }

  return (
    <header className="topbar">
      <div className="breadcrumb">
        Workspace <span>/</span> <strong>{view}</strong>
      </div>
      <div className="topbar-actions">
        <label className="search-box">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">Search plans</span>
          <input
            aria-label="Search plans"
            placeholder="Search anything"
            onChange={(event) => searchPlans(event.target.value)}
          />
          <kbd>⌘ K</kbd>
        </label>
        <span className="top-avatar" aria-label="Priyanshu">
          P
        </span>
      </div>
    </header>
  );
}
