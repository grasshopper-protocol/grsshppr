# Changelog

All notable changes to Grasshopper are recorded here. Entries link back to the
[ADR](decisions) or [RFC](product/rfc) that decided them, so the *what* always
traces to the *why*.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Changes accumulate under **Unreleased** and become a dated version when a release
is cut.

## [Unreleased]

> Entries below cover 2026-10-25 only. Changes merged between 0.1.0 and
> 2026-10-24 (for example #117, #134, ADR-0012, ADR-0013) are not yet recorded
> here.

### Added
- Privacy Policy and Terms of Service pages, linked from the footer and the
  sign-in and sign-up forms (#151, closes #147).
- [RFC-0012](product/rfc/RFC-0012-calendar-integration.md) calendar integration
  and [ADR-0014](decisions/ADR-0014-calendar-connection-auth-boundary.md)
  accepted; implementation tracked in #142 (#144).

### Changed
- Public mentor profiles show only the number of mentee goals achieved, never
  goal titles or mentee names ([ADR-0015](decisions/ADR-0015-private-mentee-goals.md),
  #150, closes #148).
- Deleting an account keeps the partner's shared sessions and notes under a
  "Deleted user" placeholder and cancels upcoming sessions with a notification
  ([ADR-0016](decisions/ADR-0016-account-deletion-keeps-partner-history.md),
  #153, closes #149).
- The daily feedback-nudge cron is paused until it can't send duplicates
  (#156, refs #154).

### Fixed
- Mentors credited on a mentee's goal can delete their account (#153).
- Cron routes accept Vercel Cron's `GET`, so scheduled runs execute (#155,
  closes #138).

### Security
- Next.js 16.4.0 → 16.4.2 for a critical RCE advisory (#146, closes #145).
- Cron routes fail closed when `CRON_SECRET` is unset and compare it in
  constant time (#155).
- Mentee names and goal titles are no longer published on public, indexed
  pages (#150).

## [0.1.0] - 2026-07-14

First tagged pre-release. Core mentoring platform (profiles, booking, notes,
goals) plus the open-product machinery and a security/quality baseline.

### Added
- Testing suite on Node's built-in runner with an enforced coverage gate
  (95% lines / 90% branches / 95% funcs) over `src/lib` pure logic
  ([RFC-0009](product/rfc/RFC-0009-testing-policy.md),
  [ADR-0011](decisions/ADR-0011-testing-gate.md)).
- Feedback & issue-handling workflow — GitHub Issues as the default channel,
  bug reports auto-escalated for triage, and enhancements tracked as issues
  first (promoted to an RFC when major).
- OpenSSF Scorecard publishing and the OpenSSF Best Practices (passing) badge.
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
- Supply-chain hardening baseline — least-privilege workflow permissions,
  SHA-pinned GitHub Actions and a digest-pinned Docker base image, Dependabot,
  CodeQL SAST, and patched transitive advisories (postcss, esbuild)
  ([ADR-0010](decisions/ADR-0010-supply-chain-hardening.md)).
- Rotated the leaked Neon database credential.

---

> **How to update:** add your change under **Unreleased** in the right category,
> and link the ADR/RFC that decided it. Trivial fixes (typos, copy) don't need an
> entry. When a release is cut, the Unreleased block becomes a dated version.
