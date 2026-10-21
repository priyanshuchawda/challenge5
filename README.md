# GatherWise

GatherWise is a practical event-planning workspace for weddings, birthdays, and community events. The application owns budgets, task status, and dates. Gemini proposes a complete plan and optional refinements; deterministic application logic calculates money and validates every suggestion before it can be applied.

Live demo: [gatherwise-event-planner.vercel.app](https://gatherwise-event-planner.vercel.app)

## Current foundation

- Create an event with its date, guest estimate, budget, location, and priorities.
- Generate an initial budget allocation and planning checklist with deterministic domain logic.
- Complete tasks and keep plans in browser-local storage without requiring an account.
- Track integer-valued expenses against deterministic budget allocations, including category actuals, remaining balance, and explicit overspend warnings.
- Manage venue, catering, and photography vendor checklists through researching, contacted, quoted, and booked states; changes persist in the browser.
- Edit a six-entry day-of run of show and export it as a spreadsheet-friendly CSV or print-ready plan.
- Request tailored inspiration from Gemini 2.5 Flash-Lite through a server-only, structured-output API route, with Gemini 2.5 Flash as a bounded transient-error fallback.
- Refine a generated idea set in plain language while preserving event context and keeping saved budgets, tasks, and event data deterministic.
- Generate, refine, review, and selectively apply a complete AI-proposed budget, dated timeline, vendor screening guide, and event ideas in English, Hindi, Tamil, Bengali, Spanish, or French.
- Support INR, USD, EUR, GBP, AED, CAD, and AUD. AI budget weights are converted into exact integer totals by largest-remainder allocation; applying a plan preserves expenses, completed tasks, and vendor workflow status.
- Enforce a byte-bounded request reader that cancels oversized streams before buffering them, strict runtime schemas for requests and model output, timeouts, and a shared Upstash sliding-window limiter that fails closed in production.
- Apply a per-request nonce-based Content Security Policy to rendered pages and a restrictive policy to API responses, alongside standard security headers.
- Keep AI calls bounded by input size, output tokens, request time, and a three-request-per-minute limit.
- Validate event input and persisted plans with Zod.
- Run strict type checking, lint, unit tests, production build, Playwright end-to-end flows, and automated axe accessibility checks locally. GitHub Actions will be enabled after the final verification and push.
- Use the demo without a third-party key or paid service.

The current storage is local to one browser. It is suitable for the demo, not shared or multi-device persistence. Vendor prices and availability are estimates and are never presented as confirmed bookings. Existing saved plans are upgraded with empty expense/vendor records when loaded.

## Requirements

- Node.js 24.x (the current Vercel default; Node 20.9+ is required by the current Next.js framework)
- pnpm 12 (the package manager version is pinned in `package.json`)

## Run locally

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000`. Use **Plan an event** to add an event. Plans stay in the current browser under the `gatherwise.plans.v1` local-storage key. Clear that key in browser storage to reset the demo.

## Deploy to Vercel

The project uses Next.js defaults and can be linked with the Vercel CLI. Authenticate with `vercel login`, then run `vercel link` and follow the prompts to select or create the GatherWise project. Add `GEMINI_API_KEY` as a **Production** environment variable through the Vercel dashboard or `vercel env add GEMINI_API_KEY production`. Production AI use also needs `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`; without them the AI endpoint intentionally fails closed while the local planner remains usable. Add these secrets through Vercel's environment-variable prompts or project settings; never pass them as command-line arguments or commit them. The live deployment uses Vercel's free Upstash integration and free Gemini API access; it does not enable paid billing.

Deploy a preview first with `vercel deploy`, verify the app and `/api/ideas` behavior, then publish with `vercel deploy --prod`. The CLI uses the linked project and Next.js framework defaults. `.vercelignore` excludes local environment files and build/test artifacts from uploads.

The deterministic planner works without external services. To enable **Ask Gemini**, copy `.env.example` to `.env.local` and add a Google AI Studio key from a project that has no paid billing enabled. `GEMINI_MODEL` defaults to `gemini-2.5-flash-lite`; `GEMINI_FALLBACK_MODEL` defaults to `gemini-2.5-flash`. Both defaults were exercised successfully against the live API with synthetic data. The fallback is used only after network/5xx failures, not on quota or configuration errors. Keep `.env.local` private; it is ignored by Git. Production AI requests also require an Upstash Redis REST URL and token so the rate limit is shared across server instances. Without those production settings, the AI route fails closed. `LOCAL_AI_RATE_LIMIT=true` is only for a private local smoke test and must not be enabled for a public deployment. The project does not create or enable paid accounts or services.

## Quality checks

```sh
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm lint
pnpm build
pnpm test:e2e
```

Playwright uses the installed system Chromium and the production server; run `pnpm build` before `pnpm test:e2e`. Browser coverage checks expense overspend warnings, saved vendor and schedule edits, custom task creation and persistence, CSV export, print mode, AI suggestion refinement, complete plan generation/refinement/apply with state preservation, the page CSP nonce and security headers, and axe rules across core views at desktop and mobile sizes. The latest complete run has 72 unit tests plus 9 production-browser tests. The latest Vitest coverage is 95.83% statements, 91.20% branches, 97.40% functions, and 98.72% lines across included API, domain, AI, HTTP, and limiter modules. Unit and browser tests mock Gemini and do not consume API quota; the separately named live smoke test makes real Gemini requests.

To exercise the real Gemini API with synthetic event details, run `pnpm test:gemini:live` after setting `GEMINI_API_KEY` in `.env.local`. This is intentionally separate from `pnpm test` and CI because it uses real API quota: generate and refine ideas, plus generate a complete plan. Responses are validated against application schemas; output excludes prompts, credentials, and generated content. The live test uses `NODE_ENV=development` so Next loads the ignored `.env.local` file; ordinary tests remain isolated from local secrets. Never enable local-only rate-limit bypasses on a public deployment.

## Architecture

```text
src/app/                    Next.js App Router and accessible planner UI
src/features/planning/      Zod contracts, deterministic domain rules, local store
src/server/ai/              Server-only Gemini provider and output validation
src/server/security/         Local and distributed AI request limits
src/app/api/ideas/           Bounded API route for AI event inspiration
src/app/api/plan/            Bounded API route for full plan generation and refinement
src/server/http/             Streaming request reader with hard byte limits
src/proxy.ts                 Per-request nonce CSP for rendered pages
docs/THREAT_MODEL.md         Assets, trust boundaries, mitigations, and known gaps
public/                     Static assets
problem.md                  Original challenge statement
```

The app is a small modular monolith. UI components collect and present data, domain functions calculate allocations and deadlines, and the storage adapter validates browser-persisted data before use. Generated or stored data is untrusted at runtime even when TypeScript types exist.

## Privacy and safety

- No account or external AI request is required for the core demo; Gemini is optional and called only after the user selects **Ask Gemini**.
- Event data is stored in this browser only; do not use a shared device for private plans.
- Do not add secrets to source control or browser-exposed `NEXT_PUBLIC_` variables.
- The AI request sends event type, date, guest estimate, budget, location, and priorities to Google. Refinement also sends the current suggestions and the user's bounded change request. It omits the event name and has no guest-list field. Avoid personal or sensitive details in priorities or refinement text.
- Google states that free-tier Gemini API content may be used to improve its products. Use synthetic event details for demos and follow the [Gemini API terms](https://ai.google.dev/gemini-api/terms).
- Budget shares are estimates. Users remain the source of truth for spending and bookings.
- Development rate limits are process-local. Production fails closed unless the shared Upstash limiter is configured; use a trusted hosting proxy that supplies `x-real-ip`.

## Challenge alignment

| Evaluation area | Evidence in the repository |
| --- | --- |
| Code quality | Strict TypeScript, small planning module, schema inferred from Zod, reproducible pnpm lockfile |
| Security | Runtime validation at request, provider-output, event, and storage boundaries; server-only key; byte-bounded streaming input; nonce CSP; distributed production limiter |
| Efficiency | Deterministic local planning, input/output bounds, bounded timeouts, rate-limited AI calls, no network dependency for the core flow |
| Testing | 72 unit tests for budget, scheduling, validation, progress, provider fallback, request limits, and API failures; nine production-browser tests with axe and CSP assertions; live synthetic Gemini smoke test |
| Accessibility | Labeled inputs, keyboard-operable controls, focus styles, reduced-motion support, status announcements, semantic tables, and manual responsive keyboard/screen-reader review |
| Problem alignment | Event context, full AI plan proposal, custom tasks, editable expense tracking, overspend detection, dated timeline, vendor screening prompts and status pipeline, six output languages, and plan refinement |

## Next scope

Add authentication and shared persistence only if the challenge requires multi-device accounts; enforce ownership and row-level security if a database is introduced. CI runs the reproducible local checks on pushes and pull requests; real Gemini smoke tests remain manual so ordinary builds do not need provider credentials.

This staged scope keeps the free, no-key demo useful while the AI and persistent multi-user boundaries are built and verified.
