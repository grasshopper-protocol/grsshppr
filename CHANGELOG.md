# Changelog

All notable changes to Grasshopper are recorded here. Entries link back to the
[ADR](decisions) or [RFC](product/rfc) that decided them, so the *what* always
traces to the *why*.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The
project is pre-1.0 and not yet versioned/tagged, so changes accumulate under
**Unreleased** until the first release cut.

## [Unreleased]

### Added
- Status token layer — `success` / `warning` / `info` semantic tokens, with
  `success` on the brand `grass` ramp ([ADR-0006](decisions/ADR-0006-status-token-layer.md),
  [RFC-0003](product/rfc/RFC-0003-status-token-layer.md)).
- Interaction-state and motion tokens — hover / focus / active / disabled and
  transition primitives ([ADR-0007](decisions/ADR-0007-interaction-states-motion.md),
  [RFC-0004](product/rfc/RFC-0004-interaction-states-motion.md)).
- Brand color adoption — `grass` mapped onto `--ring` / `--accent`, links, and
  selected states (minimal mapping) ([ADR-0005](decisions/ADR-0005-brand-color-minimal-mapping.md),
  [RFC-0002](product/rfc/RFC-0002-brand-color-adoption.md)).
- Component inventory — [design/patterns/](design/patterns/README.md).
- Open-product scaffolding — public [roadmap](product/roadmap), [RFC](product/rfc)
  and [ADR](decisions) pipelines, [governance](governance/GOVERNANCE.md),
  [personas](product/personas.md), and contributor on-ramp (ladder, labels,
  `good first issue` / `help wanted`).
- DB Migrate CI workflow applying generated migrations to production
  ([ADR-0003](decisions/ADR-0003-schema-migrations.md)).

### Changed
- Schema changes now ship as generated migrations (`db:generate` + `db:migrate`)
  instead of `db:push` against production ([ADR-0003](decisions/ADR-0003-schema-migrations.md)).
- Incident notes moved out of agent memory into [postmortems/](postmortems).

### Removed
- `@vercel/analytics` and `@vercel/speed-insights` — they contradicted the
  no-telemetry policy.

### Security
- Rotated the leaked Neon database credential.

---

> **How to update:** add your change under **Unreleased** in the right category,
> and link the ADR/RFC that decided it. Trivial fixes (typos, copy) don't need an
> entry. When a release is cut, the Unreleased block becomes a dated version.
