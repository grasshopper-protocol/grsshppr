# Now

Committed and in flight. Each item should have an owner and an open issue.

## Adopt the new token layers in components
- **Status / interaction / motion token adoption** — the token layer shipped
  ([ADR-0006](../../decisions/ADR-0006-status-token-layer.md),
  [ADR-0007](../../decisions/ADR-0007-interaction-states-motion.md)) but most
  components still use ad-hoc colors and transitions. Roll `success` / `warning`
  / `info`, hover / disabled, and motion tokens into buttons, inputs, and a
  status badge/alert primitive. _Why now:_ the tokens are defined but unused —
  the value only lands when components consume them.

> Update this list as items ship. Move completed items into the decision log
> ([decisions/LOG.md](../../decisions/LOG.md)) / release notes, not here.

## Recently shipped (moved out of Now)

**[v0.1.0](../../CHANGELOG.md) — first tagged pre-release (Beta), 2026-07-14.**

- Cut the **v0.1.0** pre-release; status moved Alpha → Beta.
- Security baseline — least-privilege CI, SHA-pinned actions + a digest-pinned
  Docker base image, Dependabot, CodeQL SAST, and patched transitive advisories
  ([ADR-0010](../../decisions/ADR-0010-supply-chain-hardening.md)).
- Testing suite + enforced coverage gate (95 / 90 / 95) over `src/lib` pure
  logic ([RFC-0009](../rfc/RFC-0009-testing-policy.md),
  [ADR-0011](../../decisions/ADR-0011-testing-gate.md)).
- Feedback & issue-handling workflow — GitHub Issues as the default channel,
  bug reports auto-escalated for triage.
- OpenSSF Scorecard published + OpenSSF Best Practices (passing) badge.
- Email notifications on booking — confirm / cancel links via Resend.
- Session cancel flow.
- Rotated the leaked Neon credential.
- Removed `@vercel/analytics` + `@vercel/speed-insights` to honor the
  no-telemetry policy.
- Adopted generated migrations and a green DB Migrate CI workflow
  ([ADR-0003](../../decisions/ADR-0003-schema-migrations.md)).
- Published governance + open-product scaffolding (roadmap, RFCs, ADRs).
- Decided the design-system direction — minimal
  ([ADR-0005](../../decisions/ADR-0005-brand-color-minimal-mapping.md)) — and
  added status / interaction / motion token layers.
