# Post-mortem: prod 500s — `column profiles.slug does not exist`

- **Date:** 2026-06-23
- **Severity:** High — profile pages errored in production
- **Status:** Resolved
- **Resulting decision:** [ADR-0003 — Generated migrations over `db:push`](../decisions/ADR-0003-schema-migrations.md)

## What happened

Production threw `column profiles.slug does not exist` (Postgres error `42703`).
A `slug` column had been added to the Drizzle schema in code, but the change was
never applied to the production (Neon) database — classic schema drift from
syncing via manual `db:push`.

## Impact

- Profile-related pages/queries 500'd in production until backfilled.
- No data loss; the column was additive.

## Root cause

There was **no migrations folder**. Schema was kept in sync by running
`drizzle-kit push` manually, so a code change could ship without the
corresponding DB change. Local and prod drifted.

## The fix (and a gotcha)

A one-off, idempotent backfill: add the column nullable → backfill `slug` from
`user.name` via slugify → set `NOT NULL` → enforce uniqueness.

**Gotcha:** the backfill first enforced uniqueness with `CREATE UNIQUE INDEX`.
Drizzle's `.unique()` expects a unique **constraint** named
`profiles_slug_unique`. With only an index present, `drizzle-kit push` proposed a
destructive DROP+TRUNCATE to reconcile (it aborted safely). Fixed
non-destructively with `DROP INDEX` + `ADD CONSTRAINT`. After that, push reported
no changes.

> **Rule:** when enforcing a Drizzle `.unique()` by hand, use `ADD CONSTRAINT`
> (named `<table>_<col>_unique`), **not** `CREATE UNIQUE INDEX` — otherwise
> `drizzle-kit push` wants a destructive reconcile.

## Lesson

The deeper cause was process, not SQL: manual `push` invites drift. Resolved by
[ADR-0003](../decisions/ADR-0003-schema-migrations.md) — the project moved to
**generated migrations**. `db:push` is now local-only; production applies
committed migrations via `drizzle-kit migrate` in CI. The existing prod DB was
baselined so the baseline migration is skipped.
