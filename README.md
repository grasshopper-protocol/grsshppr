# Grasshopper

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

## Status

� **Alpha** — Core features implemented. Ready for local testing.

## Tech Stack

Next.js 16 · TypeScript · Tailwind CSS v4 · Drizzle ORM · PostgreSQL · Better Auth · Phosphor Icons · shadcn/ui

## Getting Started

```bash
# Prerequisites: Node.js 22+, pnpm, Docker

pnpm install
cp .env.example .env.local    # Then fill in BETTER_AUTH_SECRET
docker compose up -d          # Starts PostgreSQL
pnpm db:push                  # Apply schema to DB
pnpm db:seed                  # Optional: populate sample mentors
pnpm dev                      # http://localhost:3000
```

See [AGENTS.md](AGENTS.md) for architecture guidance and [DESIGN.md](DESIGN.md) for visual direction.

## Deployment

### Vercel (recommended)

1. Push the repo to GitHub
2. Import the project on [vercel.com/new](https://vercel.com/new)
3. Set these environment variables:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (Neon, Supabase, Railway, etc.) |
| `BETTER_AUTH_SECRET` | Yes | `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Yes | Your production URL (e.g. `https://grasshopper.vercel.app`) |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth app ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth app secret |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `RESEND_API_KEY` | No | Resend API key for transactional emails |
| `CRON_SECRET` | No | Shared secret for cron endpoints (`openssl rand -hex 32`) |

4. Deploy — Vercel auto-detects Next.js

After first deploy, run `pnpm db:push` against your production database to apply the schema.

### Self-Hosting (Docker)

```bash
# Build and run with Docker Compose
BETTER_AUTH_SECRET=$(openssl rand -base64 32) \
  docker compose -f docker-compose.prod.yml up -d --build

# Apply schema to the database
docker compose -f docker-compose.prod.yml exec app \
  npx drizzle-kit push
```

The app runs on `http://localhost:3000`. See `Dockerfile` for the multi-stage build.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, code conventions, and PR guidelines.

AI agents: read [AGENTS.md](AGENTS.md) before writing any code.

## Contributors

<a href="https://github.com/grasshopper-protocol/grasshopper/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=grasshopper-protocol/grasshopper" />
</a>

## License

[MIT](LICENSE)
