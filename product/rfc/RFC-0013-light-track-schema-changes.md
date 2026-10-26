# RFC-0013: A light track for small, additive schema changes

- **Status:** Accepted (2026-10-26)
- **Author:** natos
- **Created:** 2026-10-26
- **Discipline:** Engineering (governance change — amends AGENTS.md §6)
- **Tracking issue:** [#162](https://github.com/grasshopper-protocol/grsshppr/issues/162)

## Summary

Today every schema change needs an RFC ([AGENTS.md](../../AGENTS.md) §2, §6).
This RFC adds a **light track** for changes that are additive, compatible with
the code already running, and reversible: an issue, an ADR and a generated
migration in one PR, decided by 48-hour lazy consensus. Anything destructive,
anything that rewrites data, anything touching auth tables or adding a new kind
of personal data still needs a full RFC. A small CI check refuses destructive
SQL in a migration unless it names the RFC that approved it. The RFC also writes
down the ADR lifecycle the repo already follows (Proposed until the PR merges).

## Motivation

The rule is steering designs, and not in a good direction:

- [ADR-0016](../../decisions/ADR-0016-account-deletion-keeps-partner-history.md)
  rejected nullable foreign keys partly because they were "a schema change (RFC +
  migration)" and chose a placeholder user instead.
- [ADR-0017](../../decisions/ADR-0017-feedback-prompt-once.md) rejected a
  dedicated ledger table for the same reason, so in-app notifications now carry
  correctness ("this person was prompted"), with four documented triggers that
  will force the ledger anyway.
- A known data-integrity bug stays open because its fix is one unique index:
  `POST /api/feedback` checks for existing feedback and then inserts, so two
  concurrent submissions store two ratings and skew a mentor's average
  (security review of #165).
- Three independent reviews on 2026-10-25 (Principal Engineer, Security,
  Product) reached the same conclusion unprompted.

The cost of a full RFC is right for a destructive or wide change, and wrong for
"add one index". Paying it for small changes doesn't make them safer — it makes
people avoid them, and the workaround is usually worse than the migration.

Separately, the ADR lifecycle is undocumented. Every ADR so far has merged as
**Accepted** in the PR that implements it (ADR-0014 in #144, ADR-0015 in #150,
ADR-0016 in #153, ADR-0017 in #165, ADR-0018 in #169), and #166 showed what
happens when the convention is implicit: an ADR marked Accepted sat on a branch
that never reached `main`.

**Why now:** RFC-0012's later phases add four tables, and the feedback race is
live. **If we do nothing:** more option-C designs, and the unique index waits
on an RFC nobody wants to write.

## Proposal

### 1. Two tracks

| | Light track | Full track |
|---|---|---|
| **When** | Every eligibility rule below holds | Anything else |
| **Artefacts** | Issue + ADR + generated migration, in one PR | RFC → discussion → ADR → PR(s) |
| **Decision** | Lazy consensus: PR open ≥ 48h with no objection | As today ([GOVERNANCE.md](../../governance/GOVERNANCE.md)) |
| **Escalation** | Any objection in the window moves it to the full track | — |

**Eligibility — all must hold:**

1. **Additive only:** a new table; a new nullable column or one with a constant
   default; a new index; a new unique or check constraint on data that already
   satisfies it; a new enum value.
2. **Compatible with the running code.** Migrations reach production from
   `.github/workflows/db-migrate.yml` on merge, independently of the Vercel
   deploy, so the code already live must keep working against the new schema
   (the "expand" half of expand–contract).
3. **Reversible** by a follow-up migration that loses no data written before
   the change. The ADR states how.
4. **No new kind of personal data.** If the Privacy Policy would need a new line,
   it's the full track.
5. **Not Better Auth's tables** (`users`, `accounts`, `auth_sessions`,
   `verifications`, `passkey`).
6. **No data rewrite**, with one exception: deleting rows that violate a new
   constraint (e.g. duplicates), when the ADR names exactly which rows and why.
7. **Not part of a feature that needs an RFC anyway** — then that RFC covers its
   schema (as RFC-0012 does for `calendar_feeds`).

**Requirements in the PR:**

- An ADR (template, status **Proposed**) explaining the change, the reversal
  path, and — for new constraints — the query that shows existing data
  conforms.
- The migration generated with `pnpm db:generate`. Hand edits only to add a
  pre-check or the clean-up allowed by rule 6, called out in the PR.
- Evidence it applies — provided by CI: the `build` job applies every
  migration to a fresh Postgres, and the `quality` job fails if `schema.ts` has
  changes with no migration (§2).
- The "Light-track schema change" box ticked in the PR template.

**Decision:** lazy consensus. The PR stays open for **48 hours** for comment,
then the maintainer who owns Engineering may merge. A security or
data-integrity fix may merge sooner; the PR says why.

**Full track still required for:** dropping, renaming or retyping anything;
making an existing column `NOT NULL`; data migrations or backfills; Better
Auth's tables; new kinds of personal data; anything a reviewer objects to.

### 2. Guards in CI

In the existing `quality` job:

- **Destructive SQL needs a marker.** `pnpm db:check`
  (`scripts/check-migrations.ts`, rules in `src/lib/migration-guard.ts`) scans
  every migration for statements that start with `DROP`, `TRUNCATE`,
  `DELETE FROM`, `UPDATE … SET`, or alter a table to drop, rename, retype or
  set `NOT NULL`. It fails unless the file carries
  `-- approved-by: RFC-NNNN` (full track) or `-- approved-by: ADR-NNNN` (a
  rule-6 clean-up). Clauses such as `ON DELETE cascade` don't count. It's a
  tripwire, not a parser: its job is to make a destructive change impossible
  to merge by accident under the light track.
- **No drift.** `drizzle-kit generate` must have nothing to write, i.e.
  `schema.ts` matches the committed migrations.

The `build` job already applies every migration to a fresh Postgres.

### 3. The ADR lifecycle, written down

In [decisions/README.md](../../decisions/README.md):

- **Proposed** while the PR that implements it is open.
- **Accepted** in that PR's last commit, so it merges with its change. An
  Accepted ADR on `main` always describes code on `main`.
- **Superseded by ADR-NNNN** when replaced; both link each other. Rejected
  options stay in the ADR.
- Pure process ADRs (no code) are Accepted when their docs PR merges.

### 4. Document changes (in the implementation PR)

- **AGENTS.md** §2 ("Major" definition) and §6 table: split "Schema /
  data-model change" into *additive, meeting RFC-0013 → issue + ADR + migration*
  and *anything else → RFC*.
- **PULL_REQUEST_TEMPLATE.md:** a third type, "Light-track schema change
  (RFC-0013)", with its checklist.
- **decisions/README.md:** the lifecycle (§3).
- **ENGINEERING.md:** a short "Changing the schema" section linking ADR-0003
  and this RFC.

### 5. First uses — candidates, decided separately

Each would be its own light-track PR after this RFC is accepted:

- **Unique `session_feedback(session_id, user_id)`.** Fixes the double-submit
  race; the route inserts with `ON CONFLICT DO NOTHING` and returns 409.
  Existing duplicates (if any) are removed first, keeping the earliest row —
  the rule-6 exception, named in its ADR.
- **Feedback prompt ledger** (ADR-0017 option A). **Recommendation: not yet.**
  None of ADR-0017's four triggers has landed, the current design is tested,
  and the light track makes the switch cheap the day one does.

### 6. One-time check before the first light-track migration

No migration has shipped since the `0000` baseline. Before the first one merges,
the maintainer confirms (read-only) that production has the baseline recorded:

```sql
select hash, created_at from drizzle.__drizzle_migrations order by created_at;
```

One row matching ADR-0003's baseline values means the pipeline is ready. No rows
means follow ADR-0003's runbook first. (Locally, `drizzle-kit generate` reports
no drift between `schema.ts` and `drizzle/` as of 2026-10-26.)

## Alternatives considered

- **Keep the rule as it is.** Rejected: the evidence above shows it pushing
  designs towards workarounds and leaving a data-integrity bug unfixed.
- **No special process for schema — normal PR review.** Rejected: schema is the
  hardest thing here to reverse, and ADR-0003 exists because unreviewed schema
  changes caused two production incidents.
- **A size threshold** ("migrations under N lines"). Rejected: size isn't risk;
  a one-line `DROP` is the most dangerous change there is.
- **Issue only, no ADR.** Rejected: AGENTS.md §1 requires decisions to be
  traceable, and the ADR is where the reversal path and the conformance query
  live.
- **A shorter window (24h) or none.** Not chosen: 48h gives a volunteer
  community a weekend's chance to object. See open question 1.

## Risks & trade-offs

- **Misclassification:** a destructive change labelled "additive". Mitigated by
  the eligibility rules, the PR checklist, and the CI guard (§2).
- **Deploy ordering:** migration and code deploy separately. Mitigated by rule 2
  (the running code must work with the new schema).
- **Sole maintainer:** lazy consensus is effectively self-approval today. The
  48h window still makes the decision public and objectionable before it lands.
- **First migration since baseline:** the pipeline is unexercised. Mitigated by
  §6.
- **Reversal isn't automatic:** Drizzle has no down migrations; reversal is a
  follow-up migration the ADR describes.

## Open questions

Resolved at acceptance (natos, 2026-10-26):

1. **Window length:** 48h.
2. **The ledger:** deferred until one of ADR-0017's triggers lands.
3. **The CI guard:** ships with the docs change.

## Outcome

Accepted 2026-10-26 by natos (sole maintainer; lazy consensus per
[GOVERNANCE.md](../../governance/GOVERNANCE.md)). Decision record:
[ADR-0019](../../decisions/ADR-0019-light-track-schema-changes.md).
Implemented in [#176](https://github.com/grasshopper-protocol/grsshppr/pull/176)
(docs, PR template, CI guards). First light-track candidate: the
`session_feedback` unique index.
