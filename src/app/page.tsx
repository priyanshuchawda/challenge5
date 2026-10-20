"use client";

import { useState, useSyncExternalStore } from "react";
import {
  CalendarDays, ChevronDown, CircleHelp, Flower2, LayoutDashboard, Lightbulb, Plus, Search,
  Settings2, Sparkles, WalletCards, X, Store,
} from "lucide-react";
import { addExpense, completedTaskCount, createPlan, remainingBudget, totalSpent, updateRunOfShowItem, updateVendor } from "@/features/planning/planner";
import { eventRequestSchema, ideasResponseSchema, type EventIdeas, type RunOfShowItem, type Vendor } from "@/features/planning/schema";
import { getPlansSnapshot, getServerPlansSnapshot, readPlans, savePlans, subscribeToPlans } from "@/features/planning/plan-store";
import { formatDate } from "@/features/planning/format";
import { BudgetPlannerView } from "@/features/planning/components/BudgetPlannerView";
import { EventListView } from "@/features/planning/components/EventListView";
import { InspirationView } from "@/features/planning/components/InspirationView";
import { OverviewView } from "@/features/planning/components/OverviewView";
import { TimelineAndVendorsView } from "@/features/planning/components/TimelineAndVendorsView";
import { EventFormDialog, type NewEventForm } from "@/features/planning/components/EventFormDialog";
import { ExpenseDialog } from "@/features/planning/components/ExpenseDialog";

const demoRequest = eventRequestSchema.parse({
  name: "Maya’s garden wedding", type: "Wedding", date: "2026-12-12", guests: 96,
  budget: 1800000, location: "Pune, India", priorities: ["Step-free access", "Vegetarian menu"],
});
const demoPlan = createPlan(demoRequest, "demo-wedding");
if (demoPlan.tasks[0]) demoPlan.tasks[0].completed = true;
if (demoPlan.tasks[1]) demoPlan.tasks[1].completed = true;

const today = new Date();

export default function Home() {
  const storedSnapshot = useSyncExternalStore(subscribeToPlans, getPlansSnapshot, getServerPlansSnapshot);
  const savedPlans = readPlans(storedSnapshot);
  const plans = savedPlans.length ? savedPlans : [demoPlan];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState("Overview");
  const [modalOpen, setModalOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [ideas, setIdeas] = useState<EventIdeas | null>(null);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasError, setIdeasError] = useState("");
  const [expenseModal, setExpenseModal] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState("Venue");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [form, setForm] = useState<NewEventForm>({
    name: "", type: "Wedding", date: "2027-06-12", guests: "80", budget: "1200000", location: "Pune, India", priorities: "Step-free access, Vegetarian menu",
  });

  const activePlan = plans.find((plan) => plan.id === activeId) ?? plans[0] ?? demoPlan;
  const completed = completedTaskCount(activePlan.tasks);
  const spent = totalSpent(activePlan.expenses);
  const remaining = remainingBudget(activePlan.request.budget, activePlan.expenses);
  const daysUntil = Math.max(0, Math.ceil((new Date(`${activePlan.request.date}T12:00:00`).getTime() - today.getTime()) / 86_400_000));
  const formattedEventDate = formatDate(activePlan.request.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  function changeForm(field: keyof NewEventForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleTask(taskId: string) {
    const updated = plans.map((plan) => plan.id !== activePlan.id ? plan : {
      ...plan, tasks: plan.tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed } : task),
    });
    savePlans(updated);
  }

  function changeVendorStatus(vendorId: string, status: Vendor["status"]) {
    savePlans(plans.map((plan) => plan.id === activePlan.id ? updateVendor(plan, vendorId, { status }) : plan));
  }

  function changeScheduleItem(itemId: string, field: keyof Omit<RunOfShowItem, "id">, value: string) {
    try {
      const updated = updateRunOfShowItem(activePlan, itemId, { [field]: value });
      savePlans(plans.map((plan) => plan.id === activePlan.id ? updated : plan));
    } catch {
      setNotice("That schedule change is invalid. Check the time and text length.");
    }
  }

  function saveExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const updated = addExpense(activePlan, {
        category: expenseCategory,
        description: expenseDescription,
        amount: Number(expenseAmount),
        date: new Date().toISOString().slice(0, 10),
      });
      savePlans(plans.map((plan) => plan.id === activePlan.id ? updated : plan));
      setExpenseModal(false);
      setExpenseDescription("");
      setExpenseAmount("");
      setNotice("Expense added. Budget totals are up to date.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Check the expense details.");
    }
  }

  function saveEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = {
      name: form.name,
      type: form.type,
      date: form.date,
      guests: Number(form.guests),
      budget: Number(form.budget),
      location: form.location,
      priorities: form.priorities.split(",").map((item) => item.trim()).filter(Boolean),
    };
    const parsed = eventRequestSchema.safeParse(candidate);
    if (!parsed.success) {
      setNotice(parsed.error.issues[0]?.message ?? "Please check the event details.");
      return;
    }
    const plan = createPlan(parsed.data);
    savePlans([plan, ...plans.filter((item) => item.id !== demoPlan.id)]);
    setActiveId(plan.id);
    setView("Overview");
    setModalOpen(false);
    setNotice(`${parsed.data.name} is ready to plan.`);
  }

  async function askGemini() {
    setIdeasLoading(true);
    setIdeasError("");
    setIdeas(null);
    try {
      const response = await fetch("/api/ideas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: activePlan.request.type,
          date: activePlan.request.date,
          guests: activePlan.request.guests,
          budget: activePlan.request.budget,
          location: activePlan.request.location,
          priorities: activePlan.request.priorities,
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        const errorMessage = body && typeof body === "object" && "error" in body && typeof body.error === "string" ? body.error : "AI ideas are temporarily unavailable.";
        throw new Error(errorMessage);
      }
      const result = ideasResponseSchema.safeParse(body);
      if (!result.success) throw new Error("The AI returned an incomplete response. Your saved plan is unchanged.");
      setIdeas(result.data.ideas);
    } catch (error) {
      setIdeasError(error instanceof Error ? error.message : "AI ideas are temporarily unavailable.");
    } finally {
      setIdeasLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <a className="brand" href="#home" aria-label="GatherWise home">
          <span className="brand-mark"><Flower2 size={19} strokeWidth={1.8} /></span>
          <span>gather<span className="brand-light">wise</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="main-nav">
          {[
            { label: "Overview", icon: LayoutDashboard }, { label: "My events", icon: CalendarDays },
            { label: "Budget planner", icon: WalletCards }, { label: "Timeline & vendors", icon: Store }, { label: "Inspiration", icon: Lightbulb },
          ].map(({ label, icon: Icon }) => (
            <button key={label} title={label} className={`nav-link ${view === label ? "active" : ""}`} onClick={() => setView(label)}>
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" /><span>{label}</span>
              {label === "My events" && <span className="nav-count" aria-hidden="true">{plans.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="help-card">
          <div className="help-icon"><CircleHelp size={18} /></div>
          <strong>A little help?</strong>
          <p>Good celebrations start with a simple plan.</p>
          <button onClick={() => setNotice("Your plan is saved in this browser. Start with a task, then adjust as you go.")}><span>Planning tips</span><span aria-hidden="true">↗</span></button>
        </div>
        <button className="profile-button" onClick={() => setNotice("Your plans are stored privately in this browser for this demo.")}>
          <span className="avatar">P</span><span className="profile-copy"><strong>Priyanshu</strong><small>Personal workspace</small></span><ChevronDown size={16} />
        </button>
      </aside>

      <section className="main-area" id="home">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> <strong>{view}</strong></div>
          <div className="topbar-actions">
            <label className="search-box"><Search size={16} /><span className="sr-only">Search plans</span><input aria-label="Search plans" placeholder="Search anything" onChange={(event) => {
              const found = plans.find((plan) => plan.request.name.toLowerCase().includes(event.target.value.toLowerCase()));
              if (found && event.target.value) setActiveId(found.id);
            }} /><kbd>⌘ K</kbd></label>
            <button className="icon-button" aria-label="Settings" onClick={() => setNotice("Settings will be available when accounts are added.")}><Settings2 size={18} /></button>
            <span className="top-avatar" aria-label="Priyanshu">P</span>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">TUESDAY, {today.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }).toUpperCase()}</p>
              <h1>{view === "Overview" ? "Good morning, Priyanshu" : view}</h1>
              <p className="subtitle">A little more organized, a lot more room to celebrate.</p>
            </div>
            <button className="primary-button" onClick={() => { setNotice(""); setModalOpen(true); }}><Plus size={17} /> Plan an event</button>
          </div>

          {notice && <div role="status" className="notice"><Sparkles size={16} /><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice("")}><X size={16} /></button></div>}

          {view === "My events" && <EventListView
            plans={plans}
            onCreate={() => setModalOpen(true)}
            onOpen={(planId) => { setActiveId(planId); setView("Overview"); }}
          />}
          {view === "Budget planner" && <BudgetPlannerView
            plan={activePlan}
            spent={spent}
            remaining={remaining}
            onAddExpense={() => { setExpenseCategory(activePlan.budget[0]?.category ?? "Venue"); setExpenseModal(true); }}
          />}
          {view === "Timeline & vendors" && <TimelineAndVendorsView
            plan={activePlan}
            completed={completed}
            onToggleTask={toggleTask}
            onVendorStatusChange={changeVendorStatus}
            onScheduleChange={changeScheduleItem}
          />}
          {view === "Inspiration" && <InspirationView
            plan={activePlan}
            ideas={ideas}
            isLoading={ideasLoading}
            error={ideasError}
            onAskGemini={askGemini}
          />}
          {view === "Overview" && <OverviewView
            plan={activePlan}
            eventCount={plans.length}
            completed={completed}
            daysUntil={daysUntil}
            formattedEventDate={formattedEventDate}
            onToggleTask={toggleTask}
            onNavigate={setView}
            onNotice={setNotice}
          />}
          <footer className="footer"><span>Made for moments that matter <span className="heart">♥</span></span><span>GatherWise · Your plans stay on this device</span></footer>
        </div>
      </section>

      {modalOpen && <EventFormDialog
        form={form}
        error={notice}
        onChange={changeForm}
        onClose={() => setModalOpen(false)}
        onSubmit={saveEvent}
      />}
      {expenseModal && <ExpenseDialog
        plan={activePlan}
        category={expenseCategory}
        description={expenseDescription}
        amount={expenseAmount}
        onCategoryChange={setExpenseCategory}
        onDescriptionChange={setExpenseDescription}
        onAmountChange={setExpenseAmount}
        onClose={() => setExpenseModal(false)}
        onSubmit={saveExpense}
      />}
    </main>
  );
}
