# RFC-0008: Mentor↔Mentee Messaging

- **Status:** Draft
- **Author:** Natan
- **Created:** 2026-07-03
- **Discipline:** Product (with Design + Engineering input)
- **Tracking issue:** TBD

## Summary

Add an **async-first, pair-scoped messaging** capability so a mentor and mentee
can communicate on-platform across the lifecycle of their relationship — before a
session (prep), after it (follow-up), and between sessions (continuity). It
reuses the existing notification and email infrastructure, adds three tables and
**no** real-time infrastructure, and ships with anti-noise mechanics as
first-class requirements. Real-time delivery is deferred behind a documented
upgrade path.

## Motivation

Grasshopper's promise is *continuity, not a one-off call* (personas.md, core use
case #2). Yet today there is **no on-platform channel** for a mentor and mentee to
talk. The only shared text is a single per-session notes field (no authorship, no
history), and everything else is system-generated transactional email.

Every conversational need leaks off-platform or goes unserved:

- **Pre-session prep** ("here's my repo / the exact thing I'm stuck on") — nowhere
  to put it.
- **The meeting link itself** — no field exists; coordinated 100% off-platform.
- **Post-session follow-up** ("here's the resource I promised") — dies in a
  personal inbox.
- **Between-session continuity** ("made progress, stuck on X, worth another
  session?") — the relationship goes cold, breaking the core promise.

**If we do nothing:** the platform keeps hosting the *booking* but not the
*relationship*; continuity — the product's entire differentiator — stays broken
and off-platform.

## Proposal

### Model

- **Async-first.** A message is written; the recipient sees it in-app on their
  next visit and via a coalesced notification / optional email digest. No presence,
  typing indicators, or read receipts.
- **Pair-scoped.** One conversation per mentor↔mentee pair, persisting across all
  their sessions. Sessions appear as inline anchors in the thread timeline.
- **Eligibility:** a thread may exist once the pair shares **≥1 session** (any
  status). Reuses the derived relationship (`getMentorsForMentee`); no new
  "connection" concept — the conversation row *is* the connection.

### Data model (3 new tables)

- `conversations` — `id`, `mentorId`, `menteeId`, `lastMessageAt`, `createdAt`;
  `UNIQUE(mentorId, menteeId)`.
- `messages` — `id`, `conversationId` (cascade), `authorId`, `body` (Markdown),
  `createdAt`; index `(conversationId, createdAt)`.
- `conversationReads` — `(conversationId, userId)` PK, `lastReadAt`. Powers *the
  user's own* unread coalescing; **never exposed to the other party** (no receipts).

Generated migration per [ADR-0003](../../decisions/ADR-0003-schema-migrations.md).
`deleteProfile`'s manual cascade extends to purge conversations/messages/reads
(right-to-delete). No changes to existing tables for the core.

### Delivery

- **MVP:** poll-on-mount + light interval polling **while the tab is focused**
  (paused when hidden). Zero new infrastructure; identical on Vercel and
  self-host.
- **v2 upgrade path (deferred):** SSE fed by Postgres `LISTEN/NOTIFY`. The schema
  and API are transport-agnostic, so this changes only the delivery edge.

### Notifications & email (reuse)

- New `message_received` notification, `priority: "info"`, `resourceId =
  conversationId`. **No migration** (`type`/`priority` are `text`).
- **Revive the dead `info` priority:** the bell currently shows only `action`
  notifications; extend it to surface a quieter info lane. **Coalesce** N unread
  messages per thread into **one** bell entry; resolve on thread open.
- **Email digest** (not per-message) via the existing daily-cron pattern
  (`feedback/nudge`), respecting per-user frequency (daily/weekly/off) and quiet
  hours.

### Service seam

One small `core/messaging/service.ts#sendMessage()` — insert message, bump
`lastMessageAt`, upsert the recipient's `message_received` notification — in a
single transaction. No event bus (over-engineering for one producer).

### API

`GET/POST /api/conversations`, `GET/POST /api/conversations/[id]/messages`,
`POST /api/conversations/[id]/read`. Auth via better-auth, as every existing route.

### Anti-noise mechanics (load-bearing, not optional)

Per-thread coalescing · digest-by-default email · quiet hours · per-user mute /
off · block (ends eligibility) · server-side rate limiting. **No** read receipts,
typing, presence, unread *counts* beyond a single dot, streaks, or "you haven't
replied" reminders. Silence is a valid state.

### Adjacent fast-follow (separate issue)

`meetingUrl` column on `sessions` (closes the biggest off-platform leak for one
column). Referenced here, not folded into this RFC.

## Alternatives considered

1. **Real-time chat MVP** — rejected. Scores worst on the two highest-weighted
   primary-persona constraints (noise, engagement loops); its only unique win
   (in-session back-channel) is already covered by the external video tool;
   highest infra + self-host cost. **Retained as a deferred v2 upgrade path.**
2. **Session-scoped threads** — rejected. Cannot serve pre-session prep,
   between-session continuity, or the continuity the product promises.
3. **Open messaging (DM any mentor)** — rejected. Violates the mentor
   anti-noise / anti-salesy constraint; large spam/abuse surface.
4. **Third-party messaging SaaS** (Stream/Sendbird) — rejected. Conflicts with
   first-class self-hosting and the no-telemetry non-goal.
5. **Do nothing** — the status quo; conversations keep leaking off-platform and
   continuity stays broken.

## Risks & trade-offs

- **Mentor attention is the primary risk.** A noisy design would cost the platform
  its primary persona. Mitigated only if the anti-noise mechanics ship as
  first-class — if they were cut, this feature should not ship.
- **Moderation load** — user-to-user content adds a spam/abuse surface. Mitigated
  by pair-scoped eligibility (no cold DMs), rate limits, block/report; expected
  volume is low (mentoring pairs, not open chat).
- **Non-goal drift** — messaging must not become social/engagement-loop. A usage
  *spike* (messages-per-thread, digest opt-out rate) is a **failure signal**, not
  success. ROI is a *modest* lift in repeat-booking / sessions-per-pair with **low,
  healthy** volume — measured via aggregate SQL proxies, **no telemetry**.
- **Reversibility** — additive schema + reused infra keep this cheap to unwind;
  the transport-agnostic design avoids real-time lock-in.

## Open questions

1. **Pre-booking contact:** fold into the booking request (recommended) vs a
   standalone rate-limited pre-booking message.
2. **Reply-from-email:** generalize `email-tokens.ts` now or defer? (Recommend
   defer.)
3. **Retention/purge window** for self-hosters — configurable? (Default
   keep-forever.)
4. **Notes ↔ messaging boundary** — confirmed coexist + soft-link; validate it
   isn't confusing.
5. **Core UX tension** — mentee reply-expectation vs mentor no-obligation. The #1
   thing to validate with **real users**; research used synthetic personas only.

## Outcome

_To be filled in when accepted/rejected. Link the resulting ADR and implementation
PRs._
