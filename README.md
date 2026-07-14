# Grasshopper

[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/grasshopper-protocol/grsshppr/badge)](https://scorecard.dev/viewer/?uri=github.com/grasshopper-protocol/grsshppr)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/13606/badge)](https://www.bestpractices.dev/projects/13606)

Open-source mentoring platform for tech & design professionals.

## Why Grasshopper

Existing mentoring platforms are either overwhelming (38K+ unvetted mentors), expensive ($150–360/month), or lack purpose beyond a single call. Grasshopper exists because mentoring should be free, intentional, and beautiful.

**Free forever.** Mentors volunteer their time. No paywalls, no premium tiers.  
**Purposeful.** Sessions are tied to goals, not isolated events.  
**Minimal.** Every feature earns its place. No bloat.

## Core Features

### 1. Mentor Profiles + Discovery
Browse mentors by expertise, experience level, and availability. Profiles are minimal: who you are, what you know, when you're free.

### 2. Session Booking + Shared Notes
Book 1:1 sessions with a mentor. Each session has collaborative notes that persist — creating continuity across conversations.

### 3. Goal-based Progress Tracking *(opt-in module)*
Mentees define goals. Sessions link to goals. Progress is visible over time. This turns one-off calls into a journey.

## Architecture

Grasshopper is modular by design:

- **Core** — Profiles + Booking (ships with every instance)
- **Modules** — Notes, Goals (opt-in, activated per mentoring pair)

Each module is self-contained. The platform works without modules enabled; modules enhance committed mentoring relationships.

## Auth

Passwordless by design — sign in with GitHub, Google, or a passkey. No passwords,
no resets, no credential stuffing. See
[ADR-0002](decisions/ADR-0002-passwordless-auth.md).

## Status

🦗 **Beta** — Feature-complete, hardening.

## Tech Stack

Next.js 16 · TypeScript · Tailwind CSS v4 · Drizzle ORM · PostgreSQL · Better Auth · Phosphor Icons · shadcn/ui

## Getting Started

### One-click (Codespaces / Dev Container)

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/grasshopper-protocol/grsshppr)

Open in Codespaces, or locally with VS Code + Docker via **Reopen in Container**. The dev container installs deps, starts PostgreSQL, applies the schema, and seeds mentors. Then run `pnpm dev` and visit http://localhost:3000 — hot reload included.

### Manual

```bash
# Prerequisites: Node.js 22+, pnpm, Docker

pnpm install
cp .env.example .env.local    # Then fill in BETTER_AUTH_SECRET
docker compose up -d          # Starts PostgreSQL
pnpm db:push                  # Apply schema to DB
pnpm db:seed                  # Optional: populate sample mentors
pnpm dev                      # http://localhost:3000
```

See [ENGINEERING.md](ENGINEERING.md) for architecture guidance and [DESIGN.md](DESIGN.md) for visual direction.

## Deployment

### Vercel (recommended)

1. Push the repo to GitHub
2. Import the project on [vercel.com/new](https://vercel.com/new)
3. Set these environment variables:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon, Supabase, Railway, etc.) |
| `BETTER_AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Yes | Your production URL (e.g. `https://www.grsshppr.org`) |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth app ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth app secret |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `RESEND_API_KEY` | No | Resend API key for transactional emails |
| `CRON_SECRET` | No | Shared secret for cron endpoints (`openssl rand -hex 32`) |

4. Deploy — Vercel auto-detects Next.js

After first deploy, run `pnpm db:migrate` against your production database to
apply committed migrations. Never use `db:push` against production — see
[ADR-0003](decisions/ADR-0003-schema-migrations.md).

### Self-Hosting (Docker)

```bash
# Build and run with Docker Compose
BETTER_AUTH_SECRET=$(openssl rand -base64 32) \
  docker compose -f docker-compose.prod.yml up -d --build

# Apply migrations to the database
docker compose -f docker-compose.prod.yml exec app \
  npx drizzle-kit migrate
```

The app runs on `http://localhost:3000`. See `Dockerfile` for the multi-stage build.

## Contributing

- **Get the code** — clone or fork the repo; see [Getting Started](#getting-started) above for local setup.
- **Report a bug** — [open an issue](https://github.com/grasshopper-protocol/grsshppr/issues/new?template=bug.md) using the bug template. Bugs are auto-escalated for triage and ownership by @natos.
- **Request a feature** — [open a feature issue](https://github.com/grasshopper-protocol/grsshppr/issues/new?template=feature.md) or start a [Discussion](https://github.com/grasshopper-protocol/grsshppr/discussions).
- **Contribute** — read [CONTRIBUTING.md](CONTRIBUTING.md) for setup, conventions, PR guidelines, and the current feedback workflow.
- **Response target** — we aim to acknowledge new issues within two weeks, with urgent regressions handled faster when the impact is clear.

AI agents: read [AGENTS.md](AGENTS.md) for how to operate (RFCs, ADRs, traceability) and [ENGINEERING.md](ENGINEERING.md) before writing any code.

## Working in the Open

Grasshopper is a fully open product — not just open source. Code, specs, design,
decisions, and roadmap are all public.

- **Roadmap** — [product/roadmap](product/roadmap/README.md) (now / next / later)
- **Propose a change** — [RFCs](product/rfc/README.md) for anything major
- **Why things are the way they are** — [decisions](decisions/README.md) (ADRs)
- **Who decides** — [governance](governance/GOVERNANCE.md)
- **How humans + agents operate** — [AGENTS.md](AGENTS.md)

Contributions are welcome across every layer — product, design, and engineering.

## Contributors

<a href="https://github.com/grasshopper-protocol/grsshppr/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=grasshopper-protocol/grsshppr" />
</a>

## License

[MIT](LICENSE)
