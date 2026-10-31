import { Check, Sparkles } from "lucide-react";

export function LandingPreview() {
  return (
    <section className="landing-preview" aria-labelledby="preview-title">
      <div className="preview-topline">
        <span>YOUR CELEBRATION</span>
        <span className="preview-status">IN GOOD HANDS</span>
      </div>
      <h2 className="preview-title" id="preview-title">
        Sample plan · Maya’s garden wedding
      </h2>
      <div className="preview-meta">
        Pune, India <span /> 96 guests <span /> 12 Dec 2026
      </div>
      <div className="preview-budget">
        <div>
          <span>Budget overview</span>
          <strong>₹18,00,000</strong>
        </div>
        <div className="preview-bar" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="preview-legend">
          <span>Venue</span>
          <span>Food</span>
          <span>Design</span>
          <span>Photo</span>
        </div>
      </div>
      <div className="preview-tasks-title">
        <span>UP NEXT</span>
        <span>2 of 6 complete</span>
      </div>
      <div className="preview-task">
        <span className="preview-check">
          <Check size={12} />
        </span>
        <span>
          <b>Confirm step-free venue access</b>
          <small>Venue · High priority</small>
        </span>
        <time>OCT 28</time>
      </div>
      <div className="preview-task">
        <span className="preview-empty-check" />
        <span>
          <b>Confirm menu and dietary needs</b>
          <small>Food &amp; drink · High priority</small>
        </span>
        <time>NOV 03</time>
      </div>
      <div className="preview-note">
        <Sparkles size={15} />
        <span>
          <b>AI suggestions stay editable.</b> You decide what becomes part of the plan.
        </span>
      </div>
      <div className="preview-decor preview-flower" aria-hidden="true">
        ✿
      </div>
      <div className="preview-decor preview-leaf" aria-hidden="true">
        ✳
      </div>
    </section>
  );
}
