# Threat model

## Scope

This review covers the current browser-only planner and the optional Gemini ideas route. There are no user accounts, database, guest list, vendor booking integration, or analytics in this version.

## Assets and boundaries

- Event type, date, approximate guest count, budget, location, priorities, vendor workflow states, expenses, and the day-of run of show are stored in the user's browser local storage.
- A Gemini API key is read only by server-side route code from `GEMINI_API_KEY`.
- When a user selects **Ask Gemini**, the server sends a bounded event summary to Google's Gemini API. The event name and guest identities are excluded.
- Model output crosses back into the application as untrusted JSON and is validated before display.

## Main risks and controls

| Risk | Current control | Remaining limit |
| --- | --- | --- |
| API key exposed in a browser bundle or Git | Server-only environment variable; `.env*` ignored; local file permissions restricted | Deployment operators must store the key as a server secret |
| Sensitive event information sent to the provider | User-initiated request; privacy notice; no event name or guest list; prompt context is allowlisted and revalidated | Location and priorities are still sent; avoid sensitive content and use synthetic demo data |
| Prompt injection in priorities or refinement feedback | Event details, prior suggestions, and feedback are passed as untrusted JSON data; system instructions constrain the assistant; no tools or external actions are available | Models can still produce incorrect or unsuitable suggestions |
| Malformed or unsafe model output | Structured JSON response plus Zod validation; React renders strings as text | Human review is still needed before acting on suggestions |
| Provider usage exhaustion | 8 KiB body cap, 20 second provider timeout, 1,800 output-token cap, 3 requests per minute | Development limits are process-local; production requires Upstash and a trusted proxy identity header |
| Tampered browser storage | Zod validates persisted plans before use; invalid data is ignored | Local storage is not encrypted and can be edited by the device owner |
| Incorrect budget totals | Expenses use bounded positive integers; category actuals and remaining balance are computed deterministically; overspend is explicit | This is a planning aid, not accounting or tax software; deletion/edit flows for expenses are not yet available |
| False booking implication | Vendor records are shortlists with an explicit user-controlled status | No supplier search, inventory availability, contract, or payment is integrated |
| Misleading budget or booking claims | Allocation is deterministic; AI is told not to claim verified availability or prices; UI labels estimates | Real vendor quotes and bookings are outside current scope |
| Cross-user access | No remote user records exist in the current version | If accounts or a database are added, ownership and database access policies must be designed and tested before release |

## Review status

The route has unit coverage for request validation, payload size, provider quota failures, output validation, and local rate limits. Domain tests cover integer expense reconciliation, overspending, vendor-state changes, run-of-show validation/sorting, and migration from older browser plans. A manual browser run verifies the interactive workflows and responsive layouts; automated axe checks cover the principal views. This is a scoped review, not a claim of formal security certification or a full OWASP audit.
