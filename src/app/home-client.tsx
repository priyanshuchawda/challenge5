"use client";

import { useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { formatDate } from "@/features/planning/format";
import { useEventIdeas } from "@/features/planning/hooks/useEventIdeas";
import { usePlannerWorkspace } from "@/features/planning/hooks/usePlannerWorkspace";
import { useWorkspaceForms } from "@/features/planning/hooks/useWorkspaceForms";
import { PlannerSidebar, type PlannerView } from "./workspace/PlannerSidebar";
import { PlannerViewContent } from "./workspace/PlannerViewContent";
import { WorkspaceTopbar } from "./workspace/WorkspaceTopbar";
import { WorkspaceDialogs } from "./workspace/WorkspaceDialogs";

const today = new Date();

export default function Home() {
  const [notice, setNotice] = useState("");
  const workspace = usePlannerWorkspace(setNotice);
  const [view, setView] = useState<PlannerView>("Overview");
  const dialogs = useWorkspaceForms({
    actions: workspace,
    onNotice: setNotice,
    onEventCreated: () => setView("Overview"),
  });
  const ideasState = useEventIdeas();
  const { plans, activePlan, activePlanStats } = workspace;
  const {
    ideas,
    refinement: ideaRefinement,
    setRefinement: setIdeaRefinement,
    isLoading: ideasLoading,
    error: ideasError,
    requestIdeas,
    reset: resetIdeas,
  } = ideasState;
  const [planLanguage, setPlanLanguage] = useState("English");

  const daysUntil = Math.max(
    0,
    Math.ceil(
      (new Date(`${activePlan.request.date}T12:00:00`).getTime() - today.getTime()) / 86_400_000,
    ),
  );
  const formattedEventDate = formatDate(activePlan.request.date, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function selectPlan(planId: string) {
    workspace.selectPlan(planId);
    resetIdeas();
  }

  function askGemini(refinementText?: string) {
    void requestIdeas(activePlan, refinementText);
  }

  return (
    <main className="app-shell">
      <PlannerSidebar view={view} eventCount={plans.length} onNavigate={setView} />

      <section className="main-area" id="home">
        <WorkspaceTopbar view={view} plans={plans} onSelectPlan={selectPlan} />

        <div className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                TUESDAY,{" "}
                {today
                  .toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
                  .toUpperCase()}
              </p>
              <h1>{view === "Overview" ? "Good morning, Priyanshu" : view}</h1>
              <p className="subtitle">A little more organized, a lot more room to celebrate.</p>
            </div>
            <button
              className="primary-button"
              onClick={() => {
                setNotice("");
                dialogs.setEventOpen(true);
              }}
            >
              <Plus size={17} /> Plan an event
            </button>
          </div>

          {notice && (
            <div role="status" className="notice">
              <Sparkles size={16} />
              <span>{notice}</span>
              <button aria-label="Dismiss message" onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}

          <PlannerViewContent
            view={view}
            plans={plans}
            plan={activePlan}
            stats={activePlanStats}
            daysUntil={daysUntil}
            formattedEventDate={formattedEventDate}
            ideas={ideas}
            ideasLoading={ideasLoading}
            ideasError={ideasError}
            ideaRefinement={ideaRefinement}
            planLanguage={planLanguage}
            onPlanLanguageChange={setPlanLanguage}
            onIdeaRefinementChange={setIdeaRefinement}
            onAskGemini={askGemini}
            onApplyPlan={(proposal) => {
              workspace.applyPlanProposal(proposal);
              setNotice(
                "AI plan applied. Completed tasks, vendor statuses, and recorded expenses were preserved.",
              );
            }}
            onSelectView={setView}
            onCreateEvent={() => dialogs.setEventOpen(true)}
            onOpenEvent={(planId) => {
              selectPlan(planId);
              setView("Overview");
            }}
            onToggleTask={workspace.toggleTask}
            onVendorStatusChange={workspace.changeVendorStatus}
            onScheduleChange={workspace.changeScheduleItem}
            onAddExpense={() => {
              dialogs.setExpenseCategory(activePlan.budget[0]?.category ?? "Venue");
              dialogs.setExpenseOpen(true);
            }}
            onAddTask={() => dialogs.setTaskOpen(true)}
          />
        </div>
      </section>

      <WorkspaceDialogs
        eventOpen={dialogs.eventOpen}
        eventForm={dialogs.eventForm}
        eventError={notice}
        expenseOpen={dialogs.expenseOpen}
        expensePlan={activePlan}
        expenseCategory={dialogs.expenseCategory}
        expenseDescription={dialogs.expenseDescription}
        expenseAmount={dialogs.expenseAmount}
        taskOpen={dialogs.taskOpen}
        taskDraft={dialogs.taskDraft}
        onEventFormChange={dialogs.changeEventForm}
        onEventClose={() => dialogs.setEventOpen(false)}
        onEventSubmit={dialogs.saveEvent}
        onExpenseCategoryChange={dialogs.setExpenseCategory}
        onExpenseDescriptionChange={dialogs.setExpenseDescription}
        onExpenseAmountChange={dialogs.setExpenseAmount}
        onExpenseClose={() => dialogs.setExpenseOpen(false)}
        onExpenseSubmit={dialogs.saveExpense}
        onTaskChange={dialogs.changeTaskDraft}
        onTaskClose={() => dialogs.setTaskOpen(false)}
        onTaskSubmit={dialogs.saveTask}
      />
    </main>
  );
}
