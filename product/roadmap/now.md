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

> Update this list as items ship. Move completed items into the decision log
> ([decisions/LOG.md](../../decisions/LOG.md)) / release notes, not here.

## Recently shipped (moved out of Now)

**2026-10-25 — unreleased (see [CHANGELOG](../../CHANGELOG.md#unreleased)).**

- Post-session feedback: the prompt goes out once per person (#165, closes #154,
  [ADR-0017](../../decisions/ADR-0017-feedback-prompt-once.md)); every feedback
  link lands on a working form within one 7-day window (#169, re-land of #166,
  closes #157, [ADR-0018](../../decisions/ADR-0018-one-feedback-window.md));
  accessible rating form (#167, closes #158). The daily nudge is back on.
- Next.js 16.4.0 → 16.4.2 for a critical RCE advisory (#146, closes #145).
- Public mentor profiles show only an anonymous count of mentee goals
  achieved (#150, closes #148,
  [ADR-0015](../../decisions/ADR-0015-private-mentee-goals.md)).
- Privacy Policy and Terms of Service pages (#151, closes #147).
- Account deletion keeps partners' session history under a "Deleted user"
  placeholder, and mentors credited on goals can delete their account (#153,
  closes #149, [ADR-0016](../../decisions/ADR-0016-account-deletion-keeps-partner-history.md)).
- Cron routes accept Vercel's `GET` and fail closed without `CRON_SECRET`
  (#155, closes #138); the feedback nudge was paused (#156) until #165 made it safe.
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
