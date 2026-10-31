import { BudgetPlannerView } from "@/features/planning/components/BudgetPlannerView";
import { EventListView } from "@/features/planning/components/EventListView";
import { InspirationView } from "@/features/planning/components/InspirationView";
import { OverviewView } from "@/features/planning/components/OverviewView";
import { TimelineAndVendorsView } from "@/features/planning/components/TimelineAndVendorsView";
import { AIPlanPanel } from "@/features/planning/components/AIPlanPanel";
import type {
  EventIdeas,
  EventPlan,
  FullPlanResponse,
  RunOfShowItem,
  Vendor,
} from "@/features/planning/schema";
import type { PlannerView } from "./PlannerSidebar";

interface PlannerViewContentProps {
  view: PlannerView;
  plans: EventPlan[];
  plan: EventPlan;
  stats: { completed: number; spent: number; remaining: number };
  daysUntil: number;
  formattedEventDate: string;
  ideas: EventIdeas | null;
  ideasLoading: boolean;
  ideasError: string;
  ideaRefinement: string;
  planLanguage: string;
  onPlanLanguageChange: (language: string) => void;
  onIdeaRefinementChange: (value: string) => void;
  onAskGemini: (refinementText?: string) => void;
  onApplyPlan: (proposal: FullPlanResponse["plan"]) => void;
  onSelectView: (view: PlannerView) => void;
  onCreateEvent: () => void;
  onOpenEvent: (planId: string) => void;
  onToggleTask: (taskId: string) => void;
  onVendorStatusChange: (vendorId: string, status: Vendor["status"]) => void;
  onScheduleChange: (itemId: string, field: keyof Omit<RunOfShowItem, "id">, value: string) => void;
  onAddExpense: () => void;
  onAddTask: () => void;
}

export function PlannerViewContent({
  view,
  plans,
  plan,
  stats,
  daysUntil,
  formattedEventDate,
  ideas,
  ideasLoading,
  ideasError,
  ideaRefinement,
  planLanguage,
  onPlanLanguageChange,
  onIdeaRefinementChange,
  onAskGemini,
  onApplyPlan,
  onSelectView,
  onCreateEvent,
  onOpenEvent,
  onToggleTask,
  onVendorStatusChange,
  onScheduleChange,
  onAddExpense,
  onAddTask,
}: PlannerViewContentProps) {
  return (
    <>
      {view === "My events" && (
        <EventListView plans={plans} onCreate={onCreateEvent} onOpen={onOpenEvent} />
      )}
      {view === "AI planning" && (
        <AIPlanPanel
          key={plan.id}
          plan={plan}
          language={planLanguage}
          onLanguageChange={onPlanLanguageChange}
          onApply={onApplyPlan}
        />
      )}
      {view === "Budget planner" && (
        <BudgetPlannerView
          plan={plan}
          spent={stats.spent}
          remaining={stats.remaining}
          onAddExpense={onAddExpense}
        />
      )}
      {view === "Timeline & vendors" && (
        <TimelineAndVendorsView
          plan={plan}
          completed={stats.completed}
          onToggleTask={onToggleTask}
          onVendorStatusChange={onVendorStatusChange}
          onScheduleChange={onScheduleChange}
        />
      )}
      {view === "Inspiration" && (
        <InspirationView
          plan={plan}
          ideas={ideas}
          isLoading={ideasLoading}
          error={ideasError}
          refinement={ideaRefinement}
          onRefinementChange={onIdeaRefinementChange}
          onAskGemini={() => onAskGemini()}
          onRefine={() => onAskGemini(ideaRefinement.trim())}
        />
      )}
      {view === "Overview" && (
        <OverviewView
          plan={plan}
          eventCount={plans.length}
          completed={stats.completed}
          daysUntil={daysUntil}
          formattedEventDate={formattedEventDate}
          onToggleTask={onToggleTask}
          onNavigate={onSelectView}
          onAddTask={onAddTask}
        />
      )}
      <footer className="footer">
        <span>
          Made for moments that matter <span className="heart">♥</span>
        </span>
        <span>GatherWise · Your plans stay on this device</span>
      </footer>
    </>
  );
}
