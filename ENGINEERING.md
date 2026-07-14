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

### Error Handling
- Validate at system boundaries (API inputs, form submissions)
- Don't defensively code against impossible states internally
- Error messages: actionable, not apologetic (see DESIGN.md tone section)

### Data Lifecycle
- `deleteProfile()` in `src/core/profiles/queries.ts` is the canonical "delete all user data" function
- When adding a new table or storing new user-associated data, update `deleteProfile()` to clean it up
- The function deletes data that doesn't cascade automatically, then removes the profile itself

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

## Decisions

Decisions are recorded as ADRs in [`/decisions`](decisions/README.md). The
historical decision log (previously inline here) lives in
[`/decisions/LOG.md`](decisions/LOG.md). Major changes start as an
[RFC](product/rfc/README.md) before they become an ADR.
