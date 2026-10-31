"use client";

import { useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { eventRequestSchema, taskDraftSchema, type TaskDraft } from "@/features/planning/schema";
import { formatDate } from "@/features/planning/format";
import type { NewEventForm } from "@/features/planning/components/EventFormDialog";
import { useEventIdeas } from "@/features/planning/hooks/useEventIdeas";
import { usePlannerWorkspace } from "@/features/planning/hooks/usePlannerWorkspace";
import { PlannerSidebar, type PlannerView } from "./workspace/PlannerSidebar";
import { PlannerViewContent } from "./workspace/PlannerViewContent";
import { WorkspaceTopbar } from "./workspace/WorkspaceTopbar";
import { WorkspaceDialogs } from "./workspace/WorkspaceDialogs";

const today = new Date();

export default function Home() {
  const [notice, setNotice] = useState("");
  const workspace = usePlannerWorkspace(setNotice);
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
  const [view, setView] = useState<PlannerView>("Overview");
  const [modalOpen, setModalOpen] = useState(false);
  const [planLanguage, setPlanLanguage] = useState("English");
  const [expenseModal, setExpenseModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState("Venue");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [taskDraft, setTaskDraft] = useState<TaskDraft>({
    title: "",
    dueDate: new Date().toISOString().slice(0, 10),
    priority: "Medium",
    category: "Planning",
  });
  const [form, setForm] = useState<NewEventForm>({
    name: "",
    type: "Wedding",
    date: "2027-06-12",
    guests: "80",
    budget: "1200000",
    currency: "INR",
    location: "Pune, India",
    priorities: "Step-free access, Vegetarian menu",
  });

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

  function changeForm(field: keyof NewEventForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function saveExpense(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      workspace.addExpenseToActivePlan({
        category: expenseCategory,
        description: expenseDescription,
        amount: Number(expenseAmount),
        date: new Date().toISOString().slice(0, 10),
      });
      setExpenseModal(false);
      setExpenseDescription("");
      setExpenseAmount("");
      setNotice("Expense added. Budget totals are up to date.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Check the expense details.");
    }
  }

  function saveTask(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = taskDraftSchema.safeParse(taskDraft);
    if (!parsed.success) {
      setNotice(parsed.error.issues[0]?.message ?? "Check the task details.");
      return;
    }
    workspace.addTaskToActivePlan(parsed.data);
    setTaskModal(false);
    setTaskDraft({
      title: "",
      dueDate: new Date().toISOString().slice(0, 10),
      priority: "Medium",
      category: "Planning",
    });
    setNotice("Task added to your plan.");
  }

  function saveEvent(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = {
      name: form.name,
      type: form.type,
      date: form.date,
      guests: Number(form.guests),
      budget: Number(form.budget),
      currency: form.currency,
      location: form.location,
      priorities: form.priorities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };
    const parsed = eventRequestSchema.safeParse(candidate);
    if (!parsed.success) {
      setNotice(parsed.error.issues[0]?.message ?? "Please check the event details.");
      return;
    }
    workspace.createEvent(parsed.data);
    setView("Overview");
    setModalOpen(false);
    setNotice(`${parsed.data.name} is ready to plan.`);
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
                setModalOpen(true);
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
            onCreateEvent={() => setModalOpen(true)}
            onOpenEvent={(planId) => {
              selectPlan(planId);
              setView("Overview");
            }}
            onToggleTask={workspace.toggleTask}
            onVendorStatusChange={workspace.changeVendorStatus}
            onScheduleChange={workspace.changeScheduleItem}
            onAddExpense={() => {
              setExpenseCategory(activePlan.budget[0]?.category ?? "Venue");
              setExpenseModal(true);
            }}
            onAddTask={() => setTaskModal(true)}
          />
        </div>
      </section>

      <WorkspaceDialogs
        eventOpen={modalOpen}
        eventForm={form}
        eventError={notice}
        expenseOpen={expenseModal}
        expensePlan={activePlan}
        expenseCategory={expenseCategory}
        expenseDescription={expenseDescription}
        expenseAmount={expenseAmount}
        taskOpen={taskModal}
        taskDraft={taskDraft}
        onEventFormChange={changeForm}
        onEventClose={() => setModalOpen(false)}
        onEventSubmit={saveEvent}
        onExpenseCategoryChange={setExpenseCategory}
        onExpenseDescriptionChange={setExpenseDescription}
        onExpenseAmountChange={setExpenseAmount}
        onExpenseClose={() => setExpenseModal(false)}
        onExpenseSubmit={saveExpense}
        onTaskChange={(field, value) => setTaskDraft((current) => ({ ...current, [field]: value }))}
        onTaskClose={() => setTaskModal(false)}
        onTaskSubmit={saveTask}
      />
    </main>
  );
}
