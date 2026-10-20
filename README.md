# GatherWise

GatherWise is a practical event-planning workspace for weddings, birthdays, and community events. The application treats budgets, task status, and dates as application-owned data; model suggestions will be validated before they can affect a plan.

## Current foundation

- Create an event with its date, guest estimate, budget, location, and priorities.
- Generate an initial budget allocation and planning checklist with deterministic domain logic.
- Complete tasks and keep plans in browser-local storage without requiring an account.
- Track integer-valued expenses against deterministic budget allocations, including category actuals, remaining balance, and explicit overspend warnings.
- Manage venue, catering, and photography vendor checklists through researching, contacted, quoted, and booked states; changes persist in the browser.
- Edit a six-entry day-of run of show and export it as a spreadsheet-friendly CSV or print-ready plan.
- Request tailored inspiration from Gemini 3.5 Flash-Lite through a server-only, structured-output API route, with Gemini 3.8 Flash as a bounded transient-error fallback.
- Keep AI calls bounded by input size, output tokens, request time, and a three-request-per-minute limit.
- Validate event input and persisted plans with Zod.
- Run strict type checking, lint, unit tests, production build, Playwright end-to-end flows, and automated axe accessibility checks locally. GitHub Actions are disabled for this project.
- Use the demo without a third-party key or paid service.

The current storage is local to one browser. It is suitable for the demo, not shared or multi-device persistence. Vendor prices and availability are estimates and are never presented as confirmed bookings. Existing saved plans are upgraded with empty expense/vendor records when loaded.

## Requirements

- Node.js 22 LTS (Node 20.9+ is required by the current Next.js framework)
- pnpm 12 (the package manager version is pinned in `package.json`)

## Run locally

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. Use **Plan an event** to add an event. Plans stay in the current browser under the `gatherwise.plans.v1` local-storage key. Clear that key in browser storage to reset the demo.

The deterministic planner works without external services. To enable **Ask Gemini**, copy `.env.example` to `.env.local` and add a Google AI Studio key from a project that has no paid billing enabled. `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite`; `GEMINI_FALLBACK_MODEL` defaults to `gemini-3.8-flash`. The fallback is used only after network/5xx failures, not on quota or configuration errors. Keep `.env.local` private; it is ignored by Git. Production AI requests also require an Upstash Redis REST URL and token so the rate limit is shared across server instances. Without those production settings, the AI route fails closed. `LOCAL_AI_RATE_LIMIT=true` is only for a private local smoke test and must not be enabled for a public deployment. The project does not create or enable paid accounts or services.

## Quality checks

```sh
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm lint
pnpm build
pnpm test:e2e
```

Playwright uses the installed system Chromium and the production server; run `pnpm build` before `pnpm test:e2e`. Browser coverage checks expense overspend warnings, saved vendor and schedule edits, CSV export, print mode, and axe rules across four core views at desktop and mobile sizes. The suite has 19 unit tests plus 3 production-browser tests. `pnpm test:coverage` reports V8 coverage for backend modules exercised by unit tests: the latest run measured 74.3% lines overall, 83.7% for the planning domain, and 100% lines in the deterministic planner. API routes, browser storage, and rate limiting have lower line coverage and remain areas to expand. UI coverage comes from Playwright and axe checks, not the Vitest line report. Tests mock Gemini and do not consume API quota.

## Architecture

```text
src/app/                    Next.js App Router and accessible planner UI
src/features/planning/      Zod contracts, deterministic domain rules, local store
src/server/ai/              Server-only Gemini provider and output validation
src/server/security/         Local and distributed AI request limits
src/app/api/ideas/           Bounded API route for user-requested AI ideas
docs/THREAT_MODEL.md         Assets, trust boundaries, mitigations, and known gaps
public/                     Static assets
problem.md                  Original challenge statement
```

The app is a small modular monolith. UI components collect and present data, domain functions calculate allocations and deadlines, and the storage adapter validates browser-persisted data before use. Generated or stored data is untrusted at runtime even when TypeScript types exist.

## Privacy and safety

- No account or external AI request is required for the core demo; Gemini is optional and called only after the user selects **Ask Gemini**.
- Event data is stored in this browser only; do not use a shared device for private plans.
- Do not add secrets to source control or browser-exposed `NEXT_PUBLIC_` variables.
- The AI request sends event type, date, guest estimate, budget, location, and priorities to Google. It omits the event name and has no guest-list field. Avoid personal or sensitive details in priorities.
- Google states that free-tier Gemini API content may be used to improve its products. Use synthetic event details for demos and follow the [Gemini API terms](https://ai.google.dev/gemini-api/terms).
- Budget shares are estimates. Users remain the source of truth for spending and bookings.
- Development rate limits are process-local. Production fails closed unless the shared Upstash limiter is configured; use a trusted hosting proxy that supplies `x-real-ip`.

## Challenge alignment

| Evaluation area | Evidence in the repository |
| --- | --- |
| Code quality | Strict TypeScript, small planning module, schema inferred from Zod, reproducible pnpm lockfile |
| Security | Runtime validation at request, provider-output, event, and storage boundaries; server-only key; user-controlled AI call; distributed production limiter |
| Efficiency | Deterministic local planning, input/output bounds, one bounded provider request, no network dependency for the core flow |
| Testing | Unit tests for budget, scheduling, validation, progress, Gemini output, provider fallback, and API failures; locally run quality gates |
| Accessibility | Labeled inputs, keyboard-operable controls, focus styles, reduced-motion support, status announcements, semantic tables, and manual responsive keyboard/screen-reader review |
| Problem alignment | Event context, editable expense tracking, overspend detection, task timelines, vendor status pipeline, and personalized AI ideas |

## Next scope

Add authentication and shared persistence only if the challenge requires multi-device accounts; enforce ownership and row-level security if a database is introduced. GitHub Actions remain disabled by request; local quality checks are documented above.

This staged scope keeps the free, no-key demo useful while the AI and persistent multi-user boundaries are built and verified.
