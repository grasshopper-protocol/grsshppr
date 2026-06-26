# ADR-0003: Generated migrations over `db:push`

- **Status:** Accepted
- **Date:** 2026-06-25
- **Discipline:** Engineering
- **Source RFC:** none — corrective decision from production incidents

## Context

Schema has been synced to production via `drizzle-kit push`, with no migrations
folder. This caused at least two production incidents:

1. **Missing `profiles.slug`** — column added in code, never pushed to Neon;
   prod threw `column profiles.slug does not exist` (42703). The backfill then
   hit a second trap: enforcing `.unique()` via `CREATE UNIQUE INDEX` made
   `drizzle-kit push` propose a destructive DROP+TRUNCATE reconcile.
2. General drift risk: code schema and prod schema can silently diverge because
   `push` is manual and stateless.

## Options

- **Keep `db:push`** — zero ceremony, but stateless and drift-prone. Rejected;
  it has already cost two incidents.
- **Manual SQL migrations** — full control, but bypasses Drizzle's type-safe
  schema as source of truth. Rejected.
- **Generated migrations** (`drizzle-kit generate` + `migrate`) — versioned,
  reviewable, reproducible migration files committed to the repo. Chosen.

## Decision

Adopt generated migrations as the path to production:

- `pnpm db:generate` produces a versioned migration from schema changes.
- `pnpm db:migrate` applies committed migrations.
- `db:push` is for **local iteration only**, never prod.
- When manually enforcing `.unique()`, use `ADD CONSTRAINT` (named
  `<table>_<col>_unique`), never `CREATE UNIQUE INDEX`, to avoid destructive
  reconcile.

## Consequences

- Migration files are committed and reviewed like code; drift becomes visible.
- The deploy process must run `db:migrate` before serving new code.
- One-time effort: baseline the current prod schema as the first migration
  (see runbook below).
- `db:push` is now local-iteration only; never run it against prod.

## Runbook: baseline an existing prod DB (one-time)

The prod DB already has every table (created via the old `db:push` flow), but
Drizzle's bookkeeping table (`drizzle.__drizzle_migrations`) is empty. Running
`migrate` as-is would try to `CREATE TABLE` on tables that already exist and
fail. The fix is to record the `0000` baseline as **already applied** without
running its SQL.

Drizzle decides what to run by comparing each migration's `created_at` (the
`when` value in `drizzle/meta/_journal.json`) against the latest recorded row.
Mark `0000` applied by inserting one bookkeeping row.

**Values for the current baseline (`0000_sleepy_dazzler`):**

- `hash` = `sha256` of the migration file =
  `6c90d60a67301814acc28db57ddd5a2ab0eb6924caf8b6f5342ae17cae30c212`
- `created_at` = journal `when` = `1782354777415`

> If the baseline file is ever regenerated, recompute these:
> `shasum -a 256 drizzle/0000_*.sql` and read `when` from
> `drizzle/meta/_journal.json`.

**Step 1 — run once against prod.**

> **Neon SQL Editor gotcha:** Neon's driver rejects multiple statements in one
> run (`cannot insert multiple commands into a prepared statement`). Run the
> three statements below **one at a time** (clear the editor between each).
> Alternatively, `psql` handles the whole block in one go:
> `psql "$DATABASE_URL" -f path/to/baseline.sql`.

```sql
CREATE SCHEMA IF NOT EXISTS drizzle;
```

```sql
CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);
```

```sql
INSERT INTO drizzle."__drizzle_migrations" (hash, created_at)
VALUES ('6c90d60a67301814acc28db57ddd5a2ab0eb6924caf8b6f5342ae17cae30c212', 1782354777415);
```

This is non-destructive — it inserts one row and touches no application tables.

**Step 2 — verify** (should return exactly one row, then report nothing to do):

```sql
SELECT * FROM drizzle."__drizzle_migrations";
```

```bash
pnpm drizzle-kit migrate   # → no CREATE statements; clean exit
```

**Precondition:** prod schema must already match `schema.ts` (i.e.
`drizzle-kit push` reports no pending changes). Reconcile any drift before
baselining so `0000` truly equals prod.

**Fresh databases** (new self-host, new Neon branch) need **no** baselining —
just run `pnpm db:migrate` and it applies `0000` onward normally. The runbook
above is only for the pre-existing prod DB that predates migrations.

## Addendum (2026-06-26): baseline done, and how migrations get their URL

- **Prod is baselined.** The `0000_sleepy_dazzler` row is present in
  `drizzle.__drizzle_migrations` (hash above, `created_at = 1782354777415`).
  `drizzle-kit migrate` now skips `0000` and applies future migrations cleanly.
- **The workflow no longer pulls the DB URL from Vercel.** Neon's prod
  connection strings are stored as Vercel **Sensitive** environment variables,
  which `vercel env pull` returns **empty** — in CI and locally alike. So the
  old `db-migrate.yml` step (`vercel env pull` → `export DATABASE_URL`) could
  never connect. The workflow now passes the Neon **direct (non-pooling)**
  connection string from the `MIGRATION_DATABASE_URL` GitHub Actions secret
  straight to `drizzle-kit migrate`.
- The runbook above is unchanged for future baselines; substitute the direct
  connection string (e.g. `MIGRATION_DATABASE_URL`) wherever it reads
  `$DATABASE_URL`.

## Links

- `package.json` scripts: `db:generate`, `db:migrate`, `db:push`
- `.github/workflows/db-migrate.yml` (migrate-based deploy)
- `drizzle/0000_sleepy_dazzler.sql`, `drizzle/meta/_journal.json`
