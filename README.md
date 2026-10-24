# GatherWise

**A thoughtful workspace for planning celebrations—from the first idea to the day-of schedule.**

[Explore GatherWise](https://gatherwise-event-planner.vercel.app) ·
[Open the planner](https://gatherwise-event-planner.vercel.app/planner) ·
[Read the threat model](docs/THREAT_MODEL.md)

GatherWise helps people plan birthdays, weddings, and community events with a clear budget,
practical tasks, vendor research, and a run of show. Its planning assistant can draft and refine
ideas, while application code validates the suggestions and remains responsible for dates, task
state, and financial totals.

## Plan with confidence

- Create and save events with dates, guest counts, budgets, locations, currencies, and priorities.
- Organize tasks, deadlines, expenses, vendor research, and the event-day schedule in one workspace.
- See category spending, remaining budget, and overspending from deterministic calculations using
  integer amounts.
- Export the run of show as CSV or print a plan for sharing.
- Ask Gemini for tailored inspiration or a complete draft with budget suggestions, dated tasks,
  vendor screening questions, and event ideas.
- Refine an AI plan in plain language, review it, then apply it while preserving completed tasks,
  recorded expenses, and vendor progress.
- Work in English, Hindi, Tamil, Bengali, Spanish, or French; choose from INR, USD, EUR, GBP, AED,
  CAD, and AUD.

The planner works without an account, API key, or AI service. Event data is saved in the current
browser. It is not synchronized between devices. Vendor prices and availability are not verified;
vendor entries are research checklists, not bookings.

## AI that stays in its lane

The optional AI assistant uses the **Google Gemini API** through server-side Next.js routes:

- **Gemini 3.5 Flash-Lite** is the default for fast, efficient event planning.
- **Gemini 3.8 Flash** is the bounded fallback for transient provider failures or invalid model
  output.
- Zod validates incoming requests and generated JSON. The application calculates budget totals and
  calendar dates before suggestions can be applied.

AI is opt-in: it runs only when the user requests ideas or generates/refines a plan. The API key
stays on the server. The app sends event planning details to Google, but does not send an event name
or guest list. Use synthetic details for demos and avoid sensitive information. Free-tier
availability and limits depend on the Google AI Studio project and can change; review Google's
[pricing](https://ai.google.dev/gemini-api/docs/pricing) and
[data terms](https://ai.google.dev/gemini-api/terms).

## Run locally

### Requirements

- Node.js 24.x
- pnpm 12.14.0, pinned through Corepack in `package.json`

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Create an event to explore the planner. Saved
plans are stored in this browser under `gatherwise.plans.v1`; clear that local-storage entry to
reset the local demo.

### Enable Gemini locally

Copy `.env.example` to `.env.local`, then set `GEMINI_API_KEY` to a key from a Google AI Studio
project. The defaults are:

```dotenv
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_FALLBACK_MODEL=gemini-3.8-flash
```

Keep `.env.local` private; it is ignored by Git. Never use a `NEXT_PUBLIC_` prefix for a secret. In
production, configure `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` so rate limits are
shared across server instances. AI routes intentionally fail closed if production rate-limit
protection is unavailable.

To send real, synthetic-data requests to Gemini, run:

```sh
pnpm test:gemini:live
```

This live smoke test uses API quota. Ordinary tests do not call Gemini.

## Quality checks

The current local verification run includes 99 passing unit tests, 96.01% statement coverage, 97.43%
line coverage, and 10 passing Playwright journeys. The browser suite also checks axe accessibility
on the landing page at desktop and mobile sizes, core planner views, and security headers. These are
measured project checks, not a claim of perfect accessibility or security.

```sh
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:dead-code
pnpm test
pnpm test:coverage
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

The suite covers deterministic planning and budget rules, runtime validation, AI provider failures
and fallback, request-size limits, rate limiting, browser persistence, planning-view interactions,
plan refinement and application, security headers, and accessibility checks with axe. The measured
whole-source unit and component coverage is **96.28% statements, 85.92% branches, 94.52% functions,
and 97.66% lines** across included `src` application files (95 tests). This excludes Next.js entry
files and the proxy from instrumentation; the Playwright suite separately exercises the production
app. Playwright runs against the production build. GitHub Actions are configured for manual runs;
pushes and pull requests do not start CI while automation is paused.

## Deploy

The public demo is hosted on Vercel at
[gatherwise-event-planner.vercel.app](https://gatherwise-event-planner.vercel.app). To deploy your
own copy, authenticate and link the repository with the Vercel CLI, configure the server-only
environment variables above, then run:

```sh
vercel deploy
vercel deploy --prod
```

Do not pass secrets in command-line arguments or commit them. The core planner works without paid
services; Gemini availability is subject to the provider's free-tier quotas and terms.

## Architecture

```text
src/app/                    Next.js App Router, accessible UI, and API routes
src/features/planning/      Zod contracts, deterministic rules, browser storage
src/server/ai/              Gemini provider, bounded calls, output validation
src/server/security/        Shared production rate limiter
src/server/http/            Streaming request reader with byte limits
src/proxy.ts                Per-request nonce CSP and response security headers
e2e/                        Production-browser and accessibility journeys
docs/THREAT_MODEL.md        Trust boundaries, controls, and known limitations
```

The app is a modular monolith. UI components present data and collect edits; domain functions own
calculations; API routes validate untrusted input and AI output. Browser storage is user-editable
and is validated when loaded. The threat model documents what is protected and what remains out of
scope.

## Privacy and scope

- Plans are stored in the current browser and are not encrypted or synchronized.
- AI requests include only the event details needed for planning, along with bounded refinement
  context when requested.
- AI suggestions are estimates. Review them before acting; vendors are not searched, contacted, or
  booked by GatherWise.
- There are no accounts, guest lists, payment flows, vendor integrations, or remote event database
  in this version.
- Production AI access is protected by a shared Upstash rate limiter, bounded request bodies,
  provider timeouts, output limits, schema validation, and safe error responses.

See [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) for assets, trust boundaries, safeguards, and
remaining risks.
