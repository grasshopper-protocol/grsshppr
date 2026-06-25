# Contributing to Grasshopper

Thanks for your interest in contributing. Grasshopper is an open-source mentoring platform for tech & design professionals.

## Prerequisites

- **Node.js 20+**
- **pnpm** (`corepack enable`)
- **Docker** (for PostgreSQL)

## Local Setup

```bash
git clone https://github.com/grasshopper-protocol/grasshopper.git
cd grasshopper
pnpm install
cp .env.example .env.local       # Then fill in BETTER_AUTH_SECRET
docker compose up -d              # Starts PostgreSQL
pnpm db:push                     # Apply schema
pnpm db:seed                     # Optional: populate sample mentors
pnpm dev                         # http://localhost:3000
```

## Project Structure

```
src/
├── app/                  # Next.js App Router (pages + API routes)
│   ├── (marketing)/      # Public pages (landing, sign-in, sign-up)
│   ├── (platform)/       # Authenticated pages (dashboard, explore, session, settings)
│   └── api/              # REST endpoints
├── core/                 # Core domain logic
│   ├── profiles/         # Mentor/mentee profiles, discovery queries
│   └── booking/          # Session scheduling, status management
├── modules/              # Opt-in features (can be disabled independently)
│   ├── notes/            # Shared session notes
│   └── goals/            # Goal tracking
├── components/           # Shared UI (shadcn/ui primitives, theme toggle, nav)
└── lib/                  # DB client, auth config, utilities
```

Read [AGENTS.md](AGENTS.md) for how change happens (RFCs, ADRs, traceability), [ENGINEERING.md](ENGINEERING.md) for architecture rules, and [DESIGN.md](DESIGN.md) for visual direction.

## Code Conventions

- **Files:** `kebab-case`
- **Components:** `PascalCase`
- **Functions/variables:** `camelCase`
- **DB tables/columns:** `snake_case`
- **URLs/routes:** `kebab-case`

### Key Principles

- **YAGNI** — don't build it until it's needed
- **Boring over clever** — readable code wins
- **Deletion over addition** — solve problems by removing complexity
- **No premature abstractions** — abstract only when the third instance appears
- **Co-locate related code** — component + its logic + its tests belong together

### Testing

Non-trivial logic gets ONE runnable check (assert-based, no frameworks needed). Trivial one-liners don't need tests.

### Error Handling

Validate at system boundaries (API inputs, form submissions). Don't defensively code against impossible states.

## Module System

The platform has two layers:

- **Core** (`src/core/`) — profiles + booking. Always active.
- **Modules** (`src/modules/`) — notes, goals. Opt-in features.

**Rules:**
- Core works without any modules enabled
- Modules depend on core but **never on each other**
- A module can be disabled without breaking anything
- No cross-module imports

### Adding a New Module

1. Create `src/modules/<name>/queries.ts` for data access
2. Create API routes under `src/app/api/<name>/`
3. Create UI components in `src/modules/<name>/`
4. Wire into existing pages (e.g., dashboard, session detail)
5. Ensure it can be removed without breaking core or other modules

## Pull Requests

- Keep PRs small — one feature or fix per PR
- Run `pnpm build` before submitting (must pass clean)
- Include a brief description of what changed and why
- Follow existing patterns — don't introduce new libraries without discussion

## What NOT to Contribute

These are intentional constraints (see AGENTS.md):

- Auth providers beyond Better Auth (email/password + GitHub + Google)
- Analytics, tracking, or telemetry
- i18n/l10n scaffolding
- CSS libraries beyond Tailwind
- Abstractions for "future flexibility"
- Comments explaining obvious code

## AI Contributors

Read [AGENTS.md](AGENTS.md) before doing anything — it defines how change happens
(open by default, RFC before major changes, decisions traceable as ADRs, no
silent changes). Then read [ENGINEERING.md](ENGINEERING.md) for architecture
rules, naming conventions, the data model, and explicit constraints.

## License

MIT — see [LICENSE](LICENSE).
