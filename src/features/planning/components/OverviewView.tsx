import type { EventPlan } from "../schema";
import { EventBanner } from "./overview/EventBanner";
import { EventStatsGrid } from "./overview/EventStatsGrid";
import { OverviewPlanningPanels } from "./overview/OverviewPlanningPanels";

interface OverviewViewProps {
  plan: EventPlan;
  eventCount: number;
  completed: number;
  daysUntil: number;
  formattedEventDate: string;
  onToggleTask: (taskId: string) => void;
  onNavigate: (view: "My events" | "Budget planner") => void;
  onAddTask: () => void;
}

export function OverviewView({
  plan,
  eventCount,
  completed,
  daysUntil,
  formattedEventDate,
  onToggleTask,
  onNavigate,
  onAddTask,
}: OverviewViewProps) {
  const readyPercent = plan.tasks.length ? Math.round((completed / plan.tasks.length) * 100) : 0;

  return (
    <>
      <EventBanner
        plan={plan}
        daysUntil={daysUntil}
        readyPercent={readyPercent}
        formattedEventDate={formattedEventDate}
        onViewEvents={() => onNavigate("My events")}
      />
      <EventStatsGrid plan={plan} eventCount={eventCount} completed={completed} />
      <OverviewPlanningPanels
        plan={plan}
        onToggleTask={onToggleTask}
        onNavigate={onNavigate}
        onAddTask={onAddTask}
      />
    </>
  );
}
