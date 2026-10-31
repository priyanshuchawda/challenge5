# Testing and quality gates

The default test suite is deterministic and does not call Gemini or require Upstash credentials.
Live Gemini smoke tests are separate because they consume API quota and depend on provider
availability.

## Local commands

```sh
pnpm install --frozen-lockfile
pnpm audit --prod
pnpm typecheck
pnpm format:check
pnpm check:dead-code
pnpm lint
pnpm test:coverage
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

To explicitly exercise a configured Gemini API key with synthetic event details:

```sh
pnpm test:gemini:live
```

This live smoke test is excluded from normal Vitest runs and CI. Both live Gemini smoke tests passed
on 2026-11-01 with synthetic event details. This confirms current connectivity and schema
compatibility; it does not guarantee future provider availability or quota.

## Coverage and scope

On 2026-11-01, Vitest reported 125 passing tests and:

| Measure    | Result | Enforced minimum |
| ---------- | -----: | ---------------: |
| Statements | 97.94% |              97% |
| Branches   | 95.40% |              93% |
| Functions  | 95.78% |              95% |
| Lines      | 98.14% |              98% |

Coverage includes application TypeScript and TSX modules while excluding test files and Next.js
entry files `src/app/layout.tsx`, `src/app/page.tsx`, and `src/proxy.ts`. The production-browser
suite exercises the assembled app and proxy behavior separately.

## Browser and security coverage

Playwright runs against `next build`/`next start`. Its 10 journeys cover event creation and browser
persistence, task and expense edits, overspending, vendor and schedule edits, CSV/print output, AI
request failure/recovery, full-plan application and state preservation, CSP, security headers, and
axe accessibility checks. The accessibility scan covers Overview, Budget planner, Timeline &
vendors, and Inspiration at 1440px and 390px viewport widths.

## Continuous integration

`.github/workflows/quality.yml` runs on pushes and pull requests targeting `main`, and supports
manual dispatch. It installs from the frozen pnpm lockfile, audits production dependencies, runs
format/type/dead-code/lint/coverage checks, builds the app, and runs Playwright. CI has no provider
secrets; AI unit and browser tests use controlled responses.
