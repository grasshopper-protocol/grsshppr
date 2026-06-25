# RFC-0001: Mentor visibility & ranking system

- **Status:** Discussion
- **Author:** natos
- **Created:** 2026-06-25
- **Discipline:** Product (with Engineering)
- **Tracking issue:** [#31](https://github.com/grasshopper-protocol/grsshppr/issues/31)

> This RFC formalises issue #31, the first proposal to go through the RFC
> process. The issue body is the working spec; this document is the canonical,
> reviewable record and the place discussion is resolved.

## Summary

Mentors currently appear on `/explore` regardless of profile completeness or
activity, sorted oldest-first (`created_at ASC`). That rewards incumbency and
surfaces half-built or dormant profiles. This RFC introduces a **visibility &
ranking system** that gates *exposure* (not entry) and orders mentors by signals
we already collect.

**Principle:** anyone can sign up as a mentor, but to *appear* in discovery a
profile must clear a completeness bar; among those that qualify, ordering
reflects quality, activity, and fairness.

## Motivation

- Half-built mentor profiles dilute `/explore` and waste mentee attention.
- Oldest-first sorting entrenches early sign-ups and hides fresh, active mentors.
- We already collect rating, session, and goal signals but use none of them for
  discovery.
- Mentors get no feedback on why they aren't visible.

Doing nothing means discovery quality degrades as sign-ups grow — the opposite
of the "intentional, quality over quantity" product principle.

## Proposal

Phased, so value ships without waiting on schema work. Scores are computed at
query time for Phases 1–2 (no storage, no staleness).

### Phase 1 — Completeness gate + profile-strength nudge (no schema change)
Completeness score 0–100 from existing profile fields; hide mentors below
threshold from `/explore`; show every mentor a checklist of what's missing.

| Signal | Points |
|---|---|
| Has headline | 15 |
| Has bio (≥50 chars) | 15 |
| Has ≥3 expertise tags | 15 |
| Has ≥1 link | 10 |
| Has avatar (`user.image`) | 10 |
| `experienceYears` ≥ 2 | 10 |
| `available` = true | 15 |
| Has ≥1 availability window | 10 |

Threshold to appear: **40** (auto-relax if fewer than 5 mentors pass).

### Phase 2 — Composite ranking + anti-incumbency rotation (no schema change)
Replace `ORDER BY created_at` with a composite over qualified mentors, blending
completeness, `avgRating` (invisible), `completedSessions` (log-scaled), recency
of last session, and goals helped. Add a daily-seeded rotation among
similarly-ranked mentors, plus a sort control (Recommended | Newest | Most
active; default Recommended). Batch-fetch stats to avoid N+1.

### Phase 3 — Behavioral signals (requires migration)
Add `respondedAt timestamp` to `sessions`, set on confirm/decline. Derive avg
response time + decline/cancel rate; penalise slow responders; surface "usually
responds within X". Nudge dormant mentors (>45 days) via existing email infra.

### Phase 4 — Matching (mentee-side intent)
Capture lightweight mentee intent; compute `matchScore` (expertise overlap +
availability/timezone fit + capacity headroom); add a "Suggested for you" row;
mentor-stated monthly capacity as a ranking + pre-commitment input.

**Reuse, do not rebuild** (per issue inventory): `sessionFeedback`,
`getMentorStats()`, feedback API/cron, session state machine, goal attribution,
`getLastSessionByMentor()`, `getCompletedSessionCount()`.

## Alternatives considered

- **Hard entry gate** (block creating a mentor profile until complete) —
  rejected; conflicts with the open, free ethos. The gate is visibility-only.
- **Public star ratings / badges** — rejected; honours the existing decision to
  keep `avgRating` private. Public averages punish volunteers and invite gaming.
- **Storing a materialised score column** — rejected for Phases 1–2; query-time
  computation avoids staleness and a migration. Revisit only if it becomes a
  performance problem.
- **Per-request random rotation** — rejected in favour of a daily seed, so
  ordering is stable within a day and debuggable.
- **Paid/featured placement** — rejected outright; platform is free forever.

## Risks & trade-offs

- **Empty `/explore` early on** if too few mentors clear threshold → mitigated by
  auto-relaxing below 5 qualifiers.
- **N+1 in the ranking path** → must batch-fetch stats; called out in acceptance.
- **Gaming the checklist** → keep the nudge a checklist, not a visible number;
  thresholds favour substance (bio, tags, availability).
- **Query-time cost** grows with mentor count → acceptable at current scale;
  Phase-3+ may justify caching.

## Open questions

1. Threshold 40 vs 30 to avoid an early-empty `/explore`? (Lean 40 + auto-relax.)
2. Strength UX: numeric score vs plain checklist? (Lean checklist.)
3. Confirm `avgRating` stays invisible, ranking-only? (Lean yes.)
4. Rotation cadence: daily seed vs per-request random? (Lean daily seed.)
5. Phase 3 timing: migrate before booking volume exists? (Lean defer until ≥20
   active mentors.)

## Outcome

_Pending._ On acceptance: record an ADR capturing the ranking-model decisions
(visibility-only gate, invisible rating, query-time scoring), then implement
Phase 1 → Phase 2 as separate PRs linked to #31. Phases 3–4 get their own
follow-up issues (Phase 3 needs a migration per ADR-0003).
