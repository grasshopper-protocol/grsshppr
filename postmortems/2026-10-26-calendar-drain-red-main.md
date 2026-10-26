# Post-mortem: calendar drain merged with a failing integration job

- **Date:** 2026-10-26
- **Severity:** Low. `main` was red; production was unaffected because Google Calendar sync is switched off there (`CALENDAR_SYNC_ENABLED=false`).
- **Status:** Resolved. Reverted in #196, re-landed with the fix.
- **Resulting decision:** enforce [ADR-0012](../decisions/ADR-0012-change-safety-guardrails.md)'s "no red merges" with branch protection (see *Lessons*).

## What happened

#192 (calendar drain, RFC-0012 Phase 1) was merged while its `integration` check was failing. #195 (a light-track schema change) was merged the same morning, before its 48-hour window, with `quality` (the ADR lifecycle guard) and `integration` red. `main`'s `integration` job then failed on every run.

Separately, #192 was merged at 04:11 UTC while review fixes for it were still being written. Those were pushed to the branch at 04:47, after the merge, so they never reached `main`, and the PR comment describing them was about code that wasn't merged.

## Impact

- `main` was red for about an hour. No deploy was broken: the build passed, and the failing code path only runs when calendar sync is switched on, which it isn't in production.
- The review fixes (timeouts, the outage/reconnect gap, undecryptable tokens, disconnect cleanup and more) were missing from `main` until the re-land.

## Root cause

**The bug:** two clocks. Outbox rows got their due time from the database (`now()`, microseconds), but the drain judged "due" with the app server's clock (`new Date()`, milliseconds). If the drain ran within the same millisecond as the enqueue, or the database clock was slightly ahead (Vercel and Neon are different machines), a just-queued row looked "not yet due". The inline drain then did nothing, and the work waited for the daily cron. CI's fast Postgres hit this on every run; a slower local Docker database hid it. The fix's first version brought a second precision mismatch with it: a microsecond lease read back as a millisecond `Date`, which broke the "not re-queued since claim" check. That was caught before pushing.

**Why it reached `main`:** the required checks aren't enforced. GitHub allowed merging with `integration` and `quality` red. The agent also told the maintainer to "merge once CI is green" without checking CI itself before handing over, and kept pushing to a branch that might be merged at any moment.

## The fix

- Revert #192 (#196). Then re-land it with the review fixes and one clock: claims, leases and releases all use the database's `now()`, with leases truncated to milliseconds so they round-trip exactly.
- Regression test: the drain must find just-queued work while the app's clock runs 5 seconds behind the database's (`mock.timers`). It fails without the fix.
- ADR-0022 set to Accepted, noting that #195 merged before its window.

## Lessons

1. **Enforce "no red merges".** Make `quality`, `integration` and `build` required status checks in `main`'s branch protection, so GitHub refuses the merge rather than relying on memory. This is a repository setting the maintainer has to change.
2. **Hand over only verified green.** An agent reports a PR as ready only after its checks pass on the latest push, and says which commit that was.
3. **Don't push to a PR that may be merged.** Fixes found after a PR is marked ready go in a new PR, or the hand-over is withdrawn first.
4. **One clock per comparison.** Anything compared with a database timestamp is computed by the database. Values that round-trip through JavaScript are stored at millisecond precision.
