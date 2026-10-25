# ADR-0019: A light track for small, additive schema changes; the ADR lifecycle

- **Status:** Accepted
- **Date:** 2026-10-26
- **Discipline:** Engineering (governance)
- **Source RFC:** [RFC-0013](../product/rfc/RFC-0013-light-track-schema-changes.md)

## Context

AGENTS.md required an RFC for every schema change. That steered designs:
ADR-0016 and ADR-0017 both chose "no schema change" options partly to avoid an
RFC, and a data-integrity fix (a unique index on `session_feedback`) stalled
because it needed one. Three independent reviews reached the same conclusion
(#162). Separately, the ADR lifecycle — Proposed until the implementing PR
merges — was followed but never written down, and #166 showed the cost.

## Options

- **Keep an RFC for every schema change.** Rejected: evidence of workaround
  designs and a stalled fix.
- **No special process — normal PR review.** Rejected: schema is the hardest
  thing to reverse; ADR-0003 exists because of two production incidents.
- **A size threshold.** Rejected: size isn't risk.
- **Issue only, no ADR.** Rejected: decisions must be traceable (AGENTS.md §1).
- **A light track with eligibility rules, an ADR, CI guards and a 48h window
  (chosen).**

## Decision

1. **Light track** for schema changes that are additive, compatible with the
   running code, and reversible, as defined by RFC-0013's seven eligibility
   rules: issue + ADR + generated migration in one PR, open **≥ 48h** for
   objection (security or data-integrity fixes may merge sooner, saying why).
   Anything else — drop, rename, retype, `NOT NULL`, data rewrites, Better
   Auth's tables, new kinds of personal data — stays on the full RFC track, and
   any objection escalates.
2. **CI guards** in the `quality` job: `pnpm db:check` fails on destructive SQL
   in a migration without an `-- approved-by: RFC-NNNN` / `ADR-NNNN` marker,
   and `drizzle-kit generate` must have nothing to write (no drift). The
   `build` job already applies every migration to a fresh Postgres.
3. **ADR lifecycle:** Proposed while its PR is open; Accepted in that PR's last
   commit; Superseded by a linked successor. Pure process ADRs are Accepted when
   their docs PR merges.
4. **Deferred:** the feedback-prompt ledger (ADR-0017 option A) stays deferred
   until one of ADR-0017's triggers lands.

## Consequences

- Small schema fixes no longer need an RFC; the first is the
  `session_feedback(session_id, user_id)` unique index.
- A destructive change can't merge by accident under the light track; it must
  name the RFC (or, for a rule-6 clean-up, the ADR) that approved it.
- With a sole maintainer, lazy consensus is effectively self-approval; the 48h
  window keeps decisions public and objectionable before they land.
- **Before the first light-track migration**, production's
  `drizzle.__drizzle_migrations` must be confirmed to hold the `0000` baseline
  (read-only query in RFC-0013 §6); no migration has shipped since it.
- Amends AGENTS.md §2 and §6, the PR template, `decisions/README.md` and
  ENGINEERING.md ("Changing the schema").

## Links

- RFC: [RFC-0013](../product/rfc/RFC-0013-light-track-schema-changes.md) · Issue: #162 · Implementation PR: #176
- Related: [ADR-0003](ADR-0003-schema-migrations.md), [ADR-0016](ADR-0016-account-deletion-keeps-partner-history.md), [ADR-0017](ADR-0017-feedback-prompt-once.md)
