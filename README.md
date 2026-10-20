# GatherWise

GatherWise is a practical event-planning workspace for weddings, birthdays, and community events. The application treats budgets, task status, and dates as application-owned data; model suggestions will be validated before they can affect a plan.

## Current foundation

- Create an event with its date, guest estimate, budget, location, and priorities.
- Generate an initial budget allocation and planning checklist with deterministic domain logic.
- Complete tasks and keep plans in browser-local storage without requiring an account.
- Request tailored inspiration from Gemini through a server-only, structured-output API route.
- Keep AI calls bounded by input size, output tokens, request time, and a three-request-per-minute limit.
- Validate event input and persisted plans with Zod.
- Run type checking, lint, domain tests, and a production build in GitHub Actions.
- Use the demo without a third-party key or paid service.

The current storage is local to one browser. It is suitable for the demo, not shared or multi-device persistence. Vendor prices and availability are estimates and are never presented as confirmed bookings.

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

The deterministic planner works without external services. To enable **Ask Gemini**, copy `.env.example` to `.env.local` and add a Google AI Studio key from a project that has no paid billing enabled. Use the model configured by `GEMINI_MODEL`. Keep `.env.local` private; it is ignored by Git. Production AI requests also require an Upstash Redis REST URL and token so the rate limit is shared across server instances. Without those production settings, the AI route fails closed. The project does not create or enable paid accounts or services.

## Quality checks

```sh
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

The tests cover schema rejection, integer budget reconciliation, schedule generation, task completion, request validation, usage limits, model output validation, and safe provider failures. Tests mock Gemini and do not consume API quota.

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
| Testing | Unit tests for budget, scheduling, validation, progress, Gemini output, and API failures; CI checks |
| Accessibility | Labeled inputs, keyboard-operable controls, focus styles, reduced-motion support, status announcements |
| Problem alignment | Event context, budgets, timelines, vendor checklist tasks, and personalized priorities |

## Roadmap

1. Expand task and expense editing, then add export.
2. Add persistence/authentication only if the challenge requires multi-device accounts; enforce ownership and row-level security if a database is introduced.
3. Add repeatable browser end-to-end and accessibility checks to CI for the complete user journey.

This staged scope keeps the free, no-key demo useful while the AI and persistent multi-user boundaries are built and verified.
