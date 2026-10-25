# Now

Committed and in flight. Each item should have an owner and an open issue.

## Adopt the new token layers in components
- **Status / interaction / motion token adoption** — the token layer shipped
  ([ADR-0006](../../decisions/ADR-0006-status-token-layer.md),
  [ADR-0007](../../decisions/ADR-0007-interaction-states-motion.md)) but most
  components still use ad-hoc colors and transitions. Roll `success` / `warning`
  / `info`, hover / disabled, and motion tokens into buttons, inputs, and a
  status badge/alert primitive. Issues: [#46](https://github.com/grasshopper-protocol/grsshppr/issues/46)
  (badge variants), [#47](https://github.com/grasshopper-protocol/grsshppr/issues/47)
  (alert primitive); both consume the `-text` tokens from
  [ADR-0013](../../decisions/ADR-0013-status-text-tokens.md). _Why now:_ the
  tokens are defined but unused — the value only lands when components consume
  them.

## Calendar integration
- **Subscription feed, then Google Calendar event push** — a private `.ics`
  feed for every user, then opt-in Google event push with Meet links.
  Owner: natos · [#142](https://github.com/grasshopper-protocol/grsshppr/issues/142) ·
  [RFC-0012](../rfc/RFC-0012-calendar-integration.md) /
  [ADR-0014](../../decisions/ADR-0014-calendar-connection-auth-boundary.md).
  _Why now:_ confirmed sessions don't reach people's calendars and
  cancellations never propagate. Prerequisite cron fix shipped (#155).

## Post-session feedback that works
- **Prompt once, land on a working form, accessible rating** — three pending
  changes, not yet open as PRs. Owner: natos.
  - Change A — the feedback prompt is issued once per person; re-enables the
    daily nudge paused in #156.
    [#154](https://github.com/grasshopper-protocol/grsshppr/issues/154) ·
    ADR-0017 (Proposed).
  - Change B — one 7-day feedback window; every link lands on the session page.
    ADR-0018 (Proposed).
    Issue to be opened.
  - Change C — accessible rating form. Issue to be opened.

  _Why now:_ since #155 the crons actually run; without change A the nudge
  can send duplicate emails, so it stays paused until A merges.

> Update this list as items ship. Move completed items into the decision log
> ([decisions/LOG.md](../../decisions/LOG.md)) / release notes, not here.

## Recently shipped (moved out of Now)

**2026-10-25 — unreleased (see [CHANGELOG](../../CHANGELOG.md#unreleased)).**

- Next.js 16.4.0 → 16.4.2 for a critical RCE advisory (#146, closes #145).
- Public mentor profiles show only an anonymous count of mentee goals
  achieved (#150, closes #148,
  [ADR-0015](../../decisions/ADR-0015-private-mentee-goals.md)).
- Privacy Policy and Terms of Service pages (#151, closes #147).
- Account deletion keeps partners' session history under a "Deleted user"
  placeholder, and mentors credited on goals can delete their account (#153,
  closes #149, [ADR-0016](../../decisions/ADR-0016-account-deletion-keeps-partner-history.md)).
- Cron routes accept Vercel's `GET` and fail closed without `CRON_SECRET`
  (#155, closes #138); the feedback nudge is paused until change A lands (#156).
- Calendar integration accepted: [RFC-0012](../rfc/RFC-0012-calendar-integration.md) /
  [ADR-0014](../../decisions/ADR-0014-calendar-connection-auth-boundary.md) (#144).

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
