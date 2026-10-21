"use client";

import { useState } from "react";
import {
  CalendarDays,
  CircleHelp,
  Flower2,
  LayoutDashboard,
  Lightbulb,
  Plus,
  Search,
  Sparkles,
  WalletCards,
  X,
  Store,
} from "lucide-react";
import { eventRequestSchema, taskDraftSchema, type TaskDraft } from "@/features/planning/schema";
import { formatDate } from "@/features/planning/format";
import { BudgetPlannerView } from "@/features/planning/components/BudgetPlannerView";
import { EventListView } from "@/features/planning/components/EventListView";
import { InspirationView } from "@/features/planning/components/InspirationView";
import { OverviewView } from "@/features/planning/components/OverviewView";
import { TimelineAndVendorsView } from "@/features/planning/components/TimelineAndVendorsView";
import { EventFormDialog, type NewEventForm } from "@/features/planning/components/EventFormDialog";
import { ExpenseDialog } from "@/features/planning/components/ExpenseDialog";
import { TaskDialog } from "@/features/planning/components/TaskDialog";
import { AIPlanPanel } from "@/features/planning/components/AIPlanPanel";
import { useEventIdeas } from "@/features/planning/hooks/useEventIdeas";
import { usePlannerWorkspace } from "@/features/planning/hooks/usePlannerWorkspace";

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
  const [view, setView] = useState("Overview");
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

  const { completed, spent, remaining } = activePlanStats;
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

  function saveExpense(event: React.FormEvent<HTMLFormElement>) {
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

  function saveTask(event: React.FormEvent<HTMLFormElement>) {
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

  function saveEvent(event: React.FormEvent<HTMLFormElement>) {
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
      <aside className="sidebar" aria-label="Main navigation">
        <a className="brand" href="#home" aria-label="GatherWise home">
          <span className="brand-mark">
            <Flower2 size={19} strokeWidth={1.8} />
          </span>
          <span>
            gather<span className="brand-light">wise</span>
          </span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav">
          {[
            { label: "Overview", icon: LayoutDashboard },
            { label: "My events", icon: CalendarDays },
            { label: "AI planning", icon: Sparkles },
            { label: "Budget planner", icon: WalletCards },
            { label: "Timeline & vendors", icon: Store },
            { label: "Inspiration", icon: Lightbulb },
          ].map(({ label, icon: Icon }) => (
            <button
              key={label}
              title={label}
              className={`nav-link ${view === label ? "active" : ""}`}
              onClick={() => setView(label)}
            >
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>{label}</span>
              {label === "My events" && (
                <span className="nav-count" aria-hidden="true">
                  {plans.length}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="help-card">
          <div className="help-icon">
            <CircleHelp size={18} />
          </div>
          <strong>A little help?</strong>
          <p>Good celebrations start with a simple plan.</p>
        </div>
        <div className="profile-button">
          <span className="avatar" aria-hidden="true">
            P
          </span>
          <span className="profile-copy">
            <strong>Priyanshu</strong>
            <small>Saved in this browser</small>
          </span>
        </div>
      </aside>

      <section className="main-area" id="home">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>{view}</strong>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={16} />
              <span className="sr-only">Search plans</span>
              <input
                aria-label="Search plans"
                placeholder="Search anything"
                onChange={(event) => {
                  const found = plans.find((plan) =>
                    plan.request.name.toLowerCase().includes(event.target.value.toLowerCase()),
                  );
                  if (found && event.target.value) selectPlan(found.id);
                }}
              />
              <kbd>⌘ K</kbd>
            </label>
            <span className="top-avatar" aria-label="Priyanshu">
              P
            </span>
          </div>
        </header>

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

          {view === "My events" && (
            <EventListView
              plans={plans}
              onCreate={() => setModalOpen(true)}
              onOpen={(planId) => {
                selectPlan(planId);
                setView("Overview");
              }}
            />
          )}
          {view === "AI planning" && (
            <AIPlanPanel
              key={activePlan.id}
              plan={activePlan}
              language={planLanguage}
              onLanguageChange={setPlanLanguage}
              onApply={(proposal) => {
                workspace.applyPlanProposal(proposal);
                setNotice(
                  "AI plan applied. Completed tasks, vendor statuses, and recorded expenses were preserved.",
                );
              }}
            />
          )}
          {view === "Budget planner" && (
            <BudgetPlannerView
              plan={activePlan}
              spent={spent}
              remaining={remaining}
              onAddExpense={() => {
                setExpenseCategory(activePlan.budget[0]?.category ?? "Venue");
                setExpenseModal(true);
              }}
            />
          )}
          {view === "Timeline & vendors" && (
            <TimelineAndVendorsView
              plan={activePlan}
              completed={completed}
              onToggleTask={workspace.toggleTask}
              onVendorStatusChange={workspace.changeVendorStatus}
              onScheduleChange={workspace.changeScheduleItem}
            />
          )}
          {view === "Inspiration" && (
            <InspirationView
              plan={activePlan}
              ideas={ideas}
              isLoading={ideasLoading}
              error={ideasError}
              refinement={ideaRefinement}
              onRefinementChange={setIdeaRefinement}
              onAskGemini={askGemini}
              onRefine={() => void askGemini(ideaRefinement.trim())}
            />
          )}
          {view === "Overview" && (
            <OverviewView
              plan={activePlan}
              eventCount={plans.length}
              completed={completed}
              daysUntil={daysUntil}
              formattedEventDate={formattedEventDate}
              onToggleTask={workspace.toggleTask}
              onNavigate={setView}
              onAddTask={() => setTaskModal(true)}
            />
          )}
          <footer className="footer">
            <span>
              Made for moments that matter <span className="heart">♥</span>
            </span>
            <span>GatherWise · Your plans stay on this device</span>
          </footer>
        </div>
      </section>

      {modalOpen && (
        <EventFormDialog
          form={form}
          error={notice}
          onChange={changeForm}
          onClose={() => setModalOpen(false)}
          onSubmit={saveEvent}
        />
      )}
      {expenseModal && (
        <ExpenseDialog
          plan={activePlan}
          category={expenseCategory}
          description={expenseDescription}
          amount={expenseAmount}
          onCategoryChange={setExpenseCategory}
          onDescriptionChange={setExpenseDescription}
          onAmountChange={setExpenseAmount}
          onClose={() => setExpenseModal(false)}
          onSubmit={saveExpense}
        />
      )}
      {taskModal && (
        <TaskDialog
          task={taskDraft}
          onChange={(field, value) => setTaskDraft((current) => ({ ...current, [field]: value }))}
          onClose={() => setTaskModal(false)}
          onSubmit={saveTask}
        />
      )}
    </main>
  );
}
