# Grasshopper — Engineering Guide

Technical reference for the codebase: architecture, data model, conventions, and
constraints. For *how change happens* (RFCs, ADRs, governance), see
[AGENTS.md](AGENTS.md).

## What This Is

Grasshopper is an open-source, free mentoring platform for tech & design professionals. Mentors volunteer their time. Mentees book sessions and track goals. The platform is modular — core features ship lean, optional modules add depth for committed pairs.

Read [DESIGN.md](DESIGN.md) for visual/UX direction. Read [README.md](README.md) for project context.

## Core Features

1. **Profiles + Discovery** — Mentor/mentee profiles with expertise tags, bio, availability. Browse and filter.
2. **Session Booking + Shared Notes** — 1:1 session scheduling. Collaborative notes tied to each session.
3. **Goal Tracking** — Mentees set goals, link sessions to goals, track progress over time.

## Architecture

### Modular Design

The platform is composed of independent modules:

```
core/
  profiles/       → User profiles, expertise taxonomy, availability management
  booking/        → Session scheduling, time slots, confirmations, notifications

modules/
  notes/          → Shared session notes (opt-in per mentoring pair)
  goals/          → Goal setting + progress tracking (opt-in per mentoring pair)
  calendar/       → Calendar feed and Google Calendar connection (opt-in per user, RFC-0012)
```

**Rules:**
- Core works without any modules enabled
- Modules depend on core but never on each other
- A module can be disabled without breaking anything else
- Module boundaries are enforced: no cross-module imports

### Data Model (Conceptual)

```
User (mentor | mentee | both)
  → has Profile (bio, expertise[], experience_years, availability[])
  → has Sessions[] (as mentor or mentee)

Session
  → belongs to Mentor + Mentee
  → has time_slot, status (requested | confirmed | completed | cancelled)
  → has Notes (optional, module)
  → links to Goal (optional, module)

Goal (module)
  → belongs to Mentee
  → has title, description, status (active | completed | paused)
  → has Sessions[] linked

Note (module)
  → belongs to Session
  → collaborative (both mentor and mentee can edit)
  → persists after session ends
```

## Coding Philosophy

This project follows lazy-senior-dev principles:

- **YAGNI** — Don't build it until it's needed. No speculative features.
- **Boring over clever** — Readable code wins. No magic.
- **Deletion over addition** — Solve problems by removing complexity, not adding layers.
- **No premature abstractions** — Write the specific thing. Abstract only when the third instance appears.
- **Fewest files possible** — Don't create a file for one function. Don't create a folder for one file.

## Conventions

### Naming
- Files: `kebab-case`
- Components: `PascalCase`
- Functions/variables: `camelCase`
- Database tables/columns: `snake_case`
- URLs/routes: `kebab-case`

### Code Organization
- Co-locate related code (component + styles + tests together)
- No `utils/` junk drawer — if a utility exists, it belongs near its consumer
- Barrel exports (`index.ts`) only at module boundaries, not everywhere

### Testing
- **Run:** `pnpm test` (uses Node's built-in test runner via tsx — no framework needed)
- **Coverage:** `pnpm test:coverage` enforces thresholds (95% lines / 90% branches / 95%
  funcs) on the pure-logic modules in `src/lib`. This is the hard gate in CI.
- **Where:** `tests/` at the root, file per module (`<module>.test.js`)
- **Policy:** non-trivial logic (pure functions, edge cases, anything that caused a bug) gets at
  least one test. PRs that add non-trivial logic must include a test.
- **Make it testable:** logic that lives inside a route handler, React component, or a
  DB-coupled query module can't be unit-tested in isolation. Extract the pure part into a
  DB-/framework-free helper under `src/lib` (see `booking-dates.ts`, `slug.ts`) and test that.
  The consumer imports the helper; the test imports the same helper.
- No test for obvious one-liners. No test doubles unless absolutely necessary.
- Tests + coverage must pass in CI before merge (`pnpm test:coverage` is a required check).
- **Integration tests** ([ADR-0021](decisions/ADR-0021-postgres-integration-tests.md)):
  `integration/*.test.mjs` run against a real Postgres with every migration
  applied — for behaviour only a database shows (transactions, advisory locks,
  constraints, cascades, concurrent runs). Run with `pnpm test:integration`;
  CI's `integration` job runs them on every PR. They **only** use
  `INTEGRATION_DATABASE_URL` and refuse any database whose name doesn't contain
  `test`, because each test empties it. Email goes to an in-process fake of the
  Resend API (see `integration/helpers.mjs`).

### Pre-commit gate
- **`pnpm verify`** runs the same static checks Vercel enforces: `typecheck` (`tsc --noEmit`)
  then `lint` (`eslint`). Run it manually any time.
- A native git hook (`.githooks/pre-commit`, no extra dependency) runs on every commit:
  **typecheck is a hard gate** (blocks the commit — this is what `next build` on Vercel
  enforces), **lint is advisory** (mirrors CI while lint debt is cleared).
- The hook is wired automatically by the `prepare` script (`pnpm install` sets
  `core.hooksPath .githooks`). To wire it manually: `git config core.hooksPath .githooks`.
- Bypass in an emergency with `git commit --no-verify`.

### Error Handling
- Validate at system boundaries (API inputs, form submissions)
- Don't defensively code against impossible states internally
- Error messages: actionable, not apologetic (see DESIGN.md tone section)

### Data Lifecycle
- `deleteProfile()` in `src/core/profiles/queries.ts` is the canonical account-deletion function ([ADR-0016](decisions/ADR-0016-account-deletion-keeps-partner-history.md)). In one transaction it deletes the user's personal data (profile, availability, goals, the feedback they gave, notifications, sign-in data, calendar feed, Google Calendar connection — revoked at Google first) — but **keeps partners' history**: shared sessions and their notes are reassigned to the `deleted-user` placeholder, upcoming ones are cancelled with a notification, and feedback prompts naming the user are deleted.
- When adding a new table or storing new user-associated data, decide which side it falls on — the user's own data (delete it, or cascade from `users`) or shared history (keep it, reassigned) — and update `deleteProfile()` and the Privacy Policy to match.

### Notifications & Feedback
- The bell lists unread notifications: **action** ones (to do) first, then **info** ones (to know). Info items are marked read when opened; action items when the action is taken.
- The post-session feedback prompt is issued **once per participant per session** by `issueFeedbackPrompts()` — from the daily cron and when a mentor completes a session ([ADR-0017](decisions/ADR-0017-feedback-prompt-once.md)). Feedback is open from a session's end for 7 days, on every surface ([ADR-0018](decisions/ADR-0018-one-feedback-window.md)), and one rating per person is enforced by the database ([ADR-0020](decisions/ADR-0020-one-rating-per-person.md)).
- Status changes (confirm, cancel, complete) run the same emails and notifications from the app and from email links (`runTransitionEffects()`).

### Calendar sync (RFC-0012)
- Status changes queue a reconcile row per connected participant in the same transaction (`enqueueSessionSync()`). `drainCalendar()` in `src/modules/calendar/drain.ts` pushes them to Google: inline in `after()` (before the confirmation email, so it carries the Meet link), and from the daily `GET /api/calendar/drain` cron as a backstop.
- The drain works from the session's *current* status, so rows never run out of order. Transient failures (including timeouts — every Google call has one) retry with backoff and park after 5 attempts; a broken grant or tokens we can't decrypt mark the connection `error`, send one `action` notification to reconnect, and hold its rows — work is queued for broken connections too, so it all runs after reconnecting. A bad client id/secret is an operator problem and never marks users' connections.
- The inline drain is time-boxed (10s) and the booking emails run after it even if it fails; the cron stops starting work after 45s.
- Disconnecting, deleting the account, or switching Google accounts removes the user's *upcoming* events (best effort), revokes the grant and deletes the connection; past events stay.
- Integration tests run the drain against a fake Google (`startFakeGoogle()` in `integration/helpers.mjs`).

## What NOT to Do

- Don't add auth providers beyond Better Auth without explicit approval
- Don't add analytics, tracking, or telemetry
- Don't add i18n/l10n scaffolding prematurely
- Don't create abstractions for "future flexibility"
- Don't add CSS libraries beyond Tailwind without explicit approval
- Don't over-componentize (a component used once doesn't need its own file)
- Don't add comments explaining obvious code
- Don't add type annotations to code that TypeScript can infer

## Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | **Next.js 16** | App Router, RSC, Turbopack, `use cache` |
| Language | **TypeScript** (strict) | Infer where possible, annotate at boundaries |
| Styling | **Tailwind CSS v4** | Utility-first, CSS variables for theming |
| Icons | **Phosphor Icons** | `@phosphor-icons/react` — mono-weight, line style (app UI). `lucide-react` ships only inside generated shadcn/ui primitives. |
| Components | **shadcn/ui** | Cherry-picked, not full install. Radix primitives underneath |
| ORM | **Drizzle ORM** | Type-safe, SQL-like, no magic. Drizzle Kit for migrations |
| Database | **PostgreSQL** | Docker for local dev. Any Postgres host in prod |
| Auth | **Better Auth** | Open-source, lightweight, no vendor lock-in |
| Validation | **Zod** | Schema validation at system boundaries |
| Email | **React Email + Resend** | Booking confirmations. Self-hosters can swap SMTP |
| Package mgr | **pnpm** | Strict, fast, disk-efficient |
| Deployment | **Vercel** (primary) | Self-hostable via Docker + Next.js Adapter API |

### Project Structure

```
src/
├── app/                      # Next.js App Router
│   ├── (marketing)/          # Landing, about (public)
│   ├── (platform)/           # Authenticated routes
│   │   ├── explore/
│   │   ├── dashboard/
│   │   ├── session/[id]/
│   │   └── settings/
│   ├── api/                  # Route handlers
│   └── layout.tsx
├── core/
│   ├── profiles/             # Schemas, queries, components for profiles
│   └── booking/              # Scheduling, time slots, notifications
├── modules/
│   ├── notes/                # Shared session notes (opt-in)
│   └── goals/                # Goal tracking (opt-in)
├── components/               # Shared UI primitives (shadcn/ui)
├── lib/                      # DB client, auth config, shared utilities
└── app/globals.css           # Global CSS + Tailwind v4 theme (all design tokens)
drizzle/                      # Migration files (applied by .github/workflows/db-migrate.yml)
public/
docker-compose.yml            # Local Postgres
```

## Changing the schema

1. Edit `src/lib/db/schema.ts`, then `pnpm db:generate` — never `db:push`
   against a shared database ([ADR-0003](decisions/ADR-0003-schema-migrations.md)).
2. Pick the track ([RFC-0013](product/rfc/RFC-0013-light-track-schema-changes.md)):
   **additive** changes compatible with the running code (new table, nullable
   column, index, a constraint existing data already meets, enum value) take
   the light track — issue + ADR + migration in one PR, open ≥ 48h. Anything
   destructive or data-rewriting needs an RFC.
3. `pnpm db:check` must pass. Destructive SQL needs an
   `-- approved-by: RFC-NNNN` (or `ADR-NNNN` for a light-track clean-up) marker
   in the migration file. CI also fails if `schema.ts` and `drizzle/` disagree,
   and applies every migration to a fresh Postgres in the `build` job.
4. Migrations reach production on merge (`.github/workflows/db-migrate.yml`),
   separately from the code deploy — so the code already running must keep
   working against the new schema.

## Decisions

Decisions are recorded as ADRs in [`/decisions`](decisions/README.md). The
historical decision log (previously inline here) lives in
[`/decisions/LOG.md`](decisions/LOG.md). Major changes start as an
[RFC](product/rfc/README.md) before they become an ADR.
