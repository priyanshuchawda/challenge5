import {
  CalendarDays,
  CircleHelp,
  Flower2,
  LayoutDashboard,
  Lightbulb,
  Store,
  Sparkles,
  WalletCards,
} from "lucide-react";

export type PlannerView =
  | "Overview"
  | "My events"
  | "AI planning"
  | "Budget planner"
  | "Timeline & vendors"
  | "Inspiration";

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "My events", icon: CalendarDays },
  { label: "AI planning", icon: Sparkles },
  { label: "Budget planner", icon: WalletCards },
  { label: "Timeline & vendors", icon: Store },
  { label: "Inspiration", icon: Lightbulb },
] as const;

interface PlannerSidebarProps {
  view: PlannerView;
  eventCount: number;
  onNavigate: (view: PlannerView) => void;
}

export function PlannerSidebar({ view, eventCount, onNavigate }: PlannerSidebarProps) {
  return (
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
        {navigation.map(({ label, icon: Icon }) => (
          <button
            key={label}
            title={label}
            className={`nav-link ${view === label ? "active" : ""}`}
            onClick={() => onNavigate(label)}
          >
            <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
            <span>{label}</span>
            {label === "My events" && (
              <span className="nav-count" aria-hidden="true">
                {eventCount}
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
  );
}
