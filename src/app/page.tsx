"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowDownRight, ArrowUpRight, CalendarDays, Check, ChevronDown, CircleHelp,
  Clock3, Flower2, LayoutDashboard, Lightbulb, MapPin, Plus, Search,
  Settings2, Sparkles, UsersRound, WalletCards, X,
} from "lucide-react";
import { completedTaskCount, createPlan } from "@/features/planning/planner";
import { eventRequestSchema, ideasResponseSchema, type EventIdeas, type EventRequest } from "@/features/planning/schema";
import { getPlansSnapshot, getServerPlansSnapshot, readPlans, savePlans, subscribeToPlans } from "@/features/planning/plan-store";

const demoRequest = eventRequestSchema.parse({
  name: "Maya’s garden wedding", type: "Wedding", date: "2026-12-12", guests: 96,
  budget: 1800000, location: "Pune, India", priorities: ["Step-free access", "Vegetarian menu"],
});
const demoPlan = createPlan(demoRequest, "demo-wedding");
if (demoPlan.tasks[0]) demoPlan.tasks[0].completed = true;
if (demoPlan.tasks[1]) demoPlan.tasks[1].completed = true;

const money = (amount: number) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
}).format(amount);
const dateLabel = (date: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) =>
  new Intl.DateTimeFormat("en-IN", options).format(new Date(`${date}T12:00:00`));
const today = new Date();

type NewEventForm = {
  name: string; type: EventRequest["type"]; date: string; guests: string;
  budget: string; location: string; priorities: string;
};

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
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!modalOpen) return;
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const firstField = dialog?.querySelector<HTMLElement>("input, select");
    firstField?.focus();
    return () => previouslyFocused?.focus();
  }, [modalOpen]);
  const [form, setForm] = useState<NewEventForm>({
    name: "", type: "Wedding", date: "2027-06-12", guests: "80", budget: "1200000", location: "Pune, India", priorities: "Step-free access, Vegetarian menu",
  });

  const activePlan = plans.find((plan) => plan.id === activeId) ?? plans[0] ?? demoPlan;
  const completed = completedTaskCount(activePlan.tasks);
  const daysUntil = Math.max(0, Math.ceil((new Date(`${activePlan.request.date}T12:00:00`).getTime() - today.getTime()) / 86_400_000));
  const formattedEventDate = dateLabel(activePlan.request.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  function toggleTask(taskId: string) {
    const updated = plans.map((plan) => plan.id !== activePlan.id ? plan : {
      ...plan, tasks: plan.tasks.map((task) => task.id === taskId ? { ...task, completed: !task.completed } : task),
    });
    savePlans(updated);
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
            { label: "Budget planner", icon: WalletCards }, { label: "Inspiration", icon: Lightbulb },
          ].map(({ label, icon: Icon }) => (
            <button key={label} aria-label={label} title={label} className={`nav-link ${view === label ? "active" : ""}`} onClick={() => setView(label)}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
              {label === "My events" && <span className="nav-count">{plans.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="help-card">
          <div className="help-icon"><CircleHelp size={18} /></div>
          <strong>A little help?</strong>
          <p>Good celebrations start with a simple plan.</p>
          <button onClick={() => setNotice("Your plan is saved in this browser. Start with a task, then adjust as you go.")}>Planning tips <span>↗</span></button>
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

          {view === "My events" ? <section className="detail-page">
            <div className="panel-heading"><div><span className="panel-kicker">YOUR CELEBRATIONS</span><h3>All your events</h3></div><button className="primary-button" onClick={() => setModalOpen(true)}><Plus size={16} /> Plan an event</button></div>
            <div className="event-list">{plans.map((plan) => <article className="event-list-card" key={plan.id}>
              <div className="event-list-icon"><Flower2 size={19} /></div><div className="event-list-copy"><strong>{plan.request.name}</strong><span>{plan.request.type} · {dateLabel(plan.request.date, { day: "numeric", month: "long", year: "numeric" })} · {plan.request.location}</span></div><span className="event-list-budget">{money(plan.request.budget)}</span><button className="secondary-button" onClick={() => { setActiveId(plan.id); setView("Overview"); }}>Open event</button>
            </article>)}</div>
          </section> : view === "Budget planner" ? <section className="panel detail-page">
            <div className="panel-heading"><div><span className="panel-kicker">PLAN WITHIN YOUR LIMIT</span><h3>{activePlan.request.name} budget</h3></div><span className="detail-total">{money(activePlan.request.budget)}</span></div>
            <p className="detail-intro">A starting allocation based on your total budget. These are planning estimates; confirm actual prices with vendors.</p>
            <div className="budget-detail-list">{activePlan.budget.map((item) => <div className="budget-detail-row" key={item.category}><span className="legend-dot" style={{ background: item.color }} /><strong>{item.category}</strong><div className="budget-detail-track"><span style={{ width: `${item.amount / activePlan.request.budget * 100}%`, background: item.color }} /></div><b>{money(item.amount)}</b><small>{Math.round(item.amount / activePlan.request.budget * 100)}%</small></div>)}</div>
            <div className="budget-detail-total"><span>Allocated budget</span><strong>{money(activePlan.budget.reduce((sum, item) => sum + item.amount, 0))}</strong></div>
            <div className="budget-note"><Sparkles size={15} /><span>Keep your <strong>{activePlan.request.priorities.join(", ") || "event priorities"}</strong> in mind when adjusting these estimates.</span></div>
          </section> : view === "Inspiration" ? <section className="detail-page">
            <div className="panel-heading"><div><span className="panel-kicker">SMALL DETAILS, BIG FEELING</span><h3>Ideas for your {activePlan.request.type.toLowerCase()}</h3></div><button className="primary-button" onClick={askGemini} disabled={ideasLoading}><Sparkles size={15} /> {ideasLoading ? "Thinking…" : "Ask Gemini"}</button></div>
            <p className="detail-intro">A few starting points shaped around {activePlan.request.guests} guests in {activePlan.request.location}. Use what fits and leave what doesn’t.</p>
            <p className="ai-privacy">Choosing Ask Gemini sends the event type, date, guest estimate, budget, location, and priorities to Google. Don’t include personal or sensitive details in your priorities. On the free API tier, prompts may be used to improve Google products. <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">Review Google’s terms</a>.</p>
            {ideasError && <div className="notice" role="alert"><span>{ideasError}</span></div>}
            {ideas && <section className="ai-result" aria-live="polite"><span className="panel-kicker">GEMINI IDEA SET</span><h4>{ideas.theme}</h4><p className="ai-overview">{ideas.overview}</p><div className="ideas-grid">{ideas.suggestions.map((idea) => <article className="idea-card" key={`${idea.category}-${idea.title}`}><span className="panel-kicker">{idea.category.toUpperCase()}{idea.budgetFriendly ? " · BUDGET CONSCIOUS" : ""}</span><h4>{idea.title}</h4><p>{idea.detail}</p></article>)}</div><div className="budget-note"><Sparkles size={15} /><span><strong>Contingency idea:</strong> {ideas.contingency} · Suggestions are estimates, not verified bookings or vendor prices.</span></div></section>}
            <div className="ideas-grid"><article className="idea-card"><span className="idea-icon idea-green"><Flower2 size={18} /></span><span className="panel-kicker">A WARM WELCOME</span><h4>Make arrival feel easy</h4><p>Set aside a clearly marked welcome area with seating, water, and a simple way to find the event space.</p></article><article className="idea-card"><span className="idea-icon idea-peach"><UsersRound size={18} /></span><span className="panel-kicker">THOUGHTFUL HOSTING</span><h4>Plan for different needs</h4><p>{activePlan.request.priorities.length ? `Keep ${activePlan.request.priorities.join(" and ").toLowerCase()} visible in vendor conversations and the day-of checklist.` : "Ask guests about access and dietary needs early, then include confirmed arrangements in the run of show."}</p></article><article className="idea-card"><span className="idea-icon idea-lilac"><Lightbulb size={18} /></span><span className="panel-kicker">A MOMENT TO REMEMBER</span><h4>Give the gathering a ritual</h4><p>Invite guests to share a short story, add a note to a memory table, or help choose a song for one shared moment.</p></article></div>
            <p className="idea-disclaimer">These are general planning prompts, not vendor recommendations or verified availability.</p>
          </section> : <>
          <section className="event-banner" aria-label="Selected upcoming event">
            <div className="banner-photo" role="img" aria-label="Soft garden greenery and flowers"><div className="photo-shade" /><span className="photo-tag"><span className="live-dot" /> UP NEXT</span></div>
            <div className="banner-main">
              <div className="banner-topline"><span className="event-type">{activePlan.request.type}</span><button className="more-button" aria-label="Event options" onClick={() => setNotice("Event options are coming soon.")}>···</button></div>
              <h2>{activePlan.request.name}</h2>
              <div className="event-meta"><span><CalendarDays size={15} />{formattedEventDate}</span><span><MapPin size={15} />{activePlan.request.location}</span></div>
              <div className="banner-bottom">
                <div className="guest-pile" aria-label={`${activePlan.request.guests} guests`}><span>M</span><span>A</span><span>R</span><span className="guest-more">+{Math.max(0, activePlan.request.guests - 3)}</span><small><strong>{activePlan.request.guests}</strong> guests</small></div>
                <div className="countdown"><span>{daysUntil}</span><small>days to go</small></div>
              </div>
            </div>
            <div className="banner-side"><span className="side-label">YOUR PROGRESS</span><div className="progress-ring" style={{ "--progress": `${activePlan.tasks.length ? Math.round(completed / activePlan.tasks.length * 100) : 0}%` } as React.CSSProperties}><div><strong>{activePlan.tasks.length ? Math.round(completed / activePlan.tasks.length * 100) : 0}%</strong><small>ready</small></div></div><button className="text-button" onClick={() => setView("My events")}>View event <span>↗</span></button></div>
          </section>

          <section className="stats-grid" aria-label="Event summary">
            <article className="stat-card"><div className="stat-icon green"><CalendarDays size={17} /></div><span className="stat-label">UPCOMING EVENTS</span><strong className="stat-value">{plans.length.toString().padStart(2, "0")}</strong><span className="stat-foot"><span className="trend up"><ArrowUpRight size={14} /> Active</span> in your workspace</span></article>
            <article className="stat-card"><div className="stat-icon peach"><Check size={18} /></div><span className="stat-label">TASKS COMPLETED</span><strong className="stat-value">{completed}<small> / {activePlan.tasks.length}</small></strong><span className="stat-foot"><span className="trend up"><ArrowUpRight size={14} /> Keep going</span> you’re on track</span></article>
            <article className="stat-card"><div className="stat-icon lilac"><WalletCards size={17} /></div><span className="stat-label">PLANNED BUDGET</span><strong className="stat-value stat-money">{money(activePlan.request.budget)}</strong><span className="stat-foot"><span className="trend down"><ArrowDownRight size={14} /> 0%</span> spend tracked so far</span></article>
            <article className="stat-card"><div className="stat-icon teal"><UsersRound size={17} /></div><span className="stat-label">GUESTS INVITED</span><strong className="stat-value">{activePlan.request.guests}<small> people</small></strong><span className="stat-foot"><span className="trend up"><ArrowUpRight size={14} /> Ready</span> guest list estimate</span></article>
          </section>

          <section className="lower-grid">
            <article className="panel tasks-panel">
              <div className="panel-heading"><div><span className="panel-kicker">MAKE IT HAPPEN</span><h3>Your next steps</h3></div><button className="quiet-button" onClick={() => setView("My events")}>See all <span>↗</span></button></div>
              <div className="task-list">
                {activePlan.tasks.slice(0, 4).map((task) => <label className={`task-row ${task.completed ? "task-done" : ""}`} key={task.id}>
                  <input type="checkbox" checked={task.completed} onChange={() => toggleTask(task.id)} aria-label={`${task.completed ? "Mark incomplete" : "Complete"}: ${task.title}`} />
                  <span className="custom-check"><Check size={13} /></span>
                  <span className="task-copy"><strong>{task.title}</strong><small>{task.category}</small></span>
                  <span className="task-date"><Clock3 size={13} />{dateLabel(task.dueDate)}</span>
                  <span className={`priority priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
                </label>)}
              </div>
              <button className="add-task" onClick={() => setNotice("New custom tasks will be available soon.")}><Plus size={15} /> Add a task</button>
            </article>

            <article className="panel budget-panel">
              <div className="panel-heading"><div><span className="panel-kicker">SPEND WITH INTENTION</span><h3>Budget overview</h3></div><button className="quiet-button" onClick={() => setView("Budget planner")}>Details <span>↗</span></button></div>
              <div className="budget-total"><strong>{money(activePlan.request.budget)}</strong><span>total planned</span></div>
              <div className="budget-bar" aria-label="Budget allocation breakdown">{activePlan.budget.map((item) => <span key={item.category} style={{ width: `${item.amount / activePlan.request.budget * 100}%`, background: item.color }} title={`${item.category}: ${money(item.amount)}`} />)}</div>
              <div className="budget-legend">{activePlan.budget.slice(0, 4).map((item) => <div key={item.category}><span className="legend-dot" style={{ background: item.color }} /><span>{item.category}</span><strong>{money(item.amount)}</strong></div>)}</div>
              <div className="budget-note"><Sparkles size={15} /><span>Set aside <strong>{money(activePlan.budget.find((item) => item.category === "Contingency")?.amount ?? 0)}</strong> for the unexpected.</span></div>
            </article>
          </section>

          <section className="bottom-note"><div className="note-spark"><Sparkles size={16} /></div><p><strong>A thoughtful touch</strong><span>{activePlan.request.priorities.length ? `Keep ${activePlan.request.priorities.join(" and ").toLowerCase()} in view as your plan takes shape.` : "Add a few priorities to make every suggestion more personal."}</span></p><button onClick={() => setNotice("Priorities are included when you create an event.")}>Planning note <span>↗</span></button></section>
          </>}
          <footer className="footer"><span>Made for moments that matter <span className="heart">♥</span></span><span>GatherWise · Your plans stay on this device</span></footer>
        </div>
      </section>

      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false); }}><section ref={dialogRef} className="event-modal" role="dialog" aria-modal="true" aria-labelledby="new-event-title" aria-describedby="new-event-description" onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); setModalOpen(false); return; }
        if (event.key !== "Tab") return;
        const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'));
        if (!focusable.length) return;
        if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1)?.focus(); }
        else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0]?.focus(); }
      }}>
        <div className="modal-heading"><div><span className="panel-kicker">A NEW REASON TO GATHER</span><h2 id="new-event-title">Let’s make a plan</h2></div><button className="icon-button" aria-label="Close dialog" onClick={() => setModalOpen(false)}><X size={19} /></button></div>
        <p id="new-event-description" className="modal-subtitle">Start with the basics. You can shape the details as you go.</p>
        <form onSubmit={saveEvent} className="event-form">
          <label>Event name<input required minLength={2} maxLength={80} placeholder="e.g. Sam’s 30th birthday" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <div className="form-row"><label>Celebration<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EventRequest["type"] })}><option>Wedding</option><option>Birthday</option><option>Community event</option></select></label><label>Event date<input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label></div>
          <div className="form-row"><label>Guest estimate<input required type="number" min="1" max="5000" value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} /></label><label>Budget (INR)<input required type="number" min="1" step="1" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></label></div>
          <label>Location<input required minLength={2} maxLength={120} placeholder="City or venue" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></label>
          <label>What matters most?<input maxLength={240} placeholder="Step-free access, dietary needs…" value={form.priorities} onChange={(e) => setForm({ ...form, priorities: e.target.value })} /><small>Separate priorities with commas. Avoid guest names or contact details.</small></label>
          {notice && <p className="form-error" role="alert">{notice}</p>}
          <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="primary-button"><Sparkles size={16} /> Create my plan</button></div>
        </form>
        <p className="privacy-note">Your event details stay in this browser. No account required.</p>
      </section></div>}
    </main>
  );
}
