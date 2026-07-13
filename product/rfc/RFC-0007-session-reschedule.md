# RFC-0007: Session reschedule

- **Status:** Draft
- **Author:** natos
- **Created:** 2026-06-26
- **Discipline:** Product (which hat decides)
- **Tracking issue:** —

## Summary

Add a **true reschedule** to sessions: let either participant propose a new time
for an existing **confirmed** session, which the other participant accepts or
declines — all on the *same* session row, preserving its notes, goals, and
history. Cancellation already works end to end; this RFC does **not** change it
beyond removing the fake "reschedule = cancel + rebook" shortcut that currently
stands in for the feature. Touches the data model (one enum value + three
nullable columns) and therefore ships with a generated migration per
[ADR-0003](../../decisions/ADR-0003-schema-migrations.md).

## Motivation

The session detail page already shows a **Reschedule** button, but it is a
placeholder, not a feature. Today
[`actions.tsx`](../../src/app/(platform)/session/[id]/actions.tsx) does this:

```ts
// handleReschedule(): cancels the session, then redirects the mentee to rebook
body: JSON.stringify({ status: "cancelled", cancelReason: "Rescheduled" }),
// → router.push(`/mentor/${mentorSlug}`)
```

That "reschedule" is really **cancel + start over**, which is bad for three
concrete reasons:

- **It destroys the session thread.** `notes` is `references(sessions.id, { onDelete: "cascade" })`
  ([schema.ts](../../src/lib/db/schema.ts)) — cancelling and rebooking creates a
  *new* session id, so the shared notes (and the goal links and any feedback
  context) are orphaned or lost. Rescheduling a meeting should not wipe its prep.
- **It is one-sided and manual.** Only the mentee gets the button (it needs
  `mentorSlug`); a mentor who needs to move a slot has no path but to cancel. And
  the mentee must re-pick a time *and* the mentor must re-confirm a fresh request
  from zero — the relationship context is gone.
- **It pollutes the record.** Every reschedule shows up as a `cancelled` session
  with reason "Rescheduled", inflating cancellations and hiding what actually
  happened.

Doing nothing leaves a visible button that quietly throws away user work — worse
than not having it.

## Proposal

Model reschedule as a **pending proposal on the existing session**: one party
proposes new times, the other commits or rejects them. The session id never
changes, so notes/goals/feedback ride along untouched.

### 1. Data model (migration required)

Extend the existing `session_status` enum and add three nullable columns to
`sessions`:

```ts
export const sessionStatusEnum = pgEnum("session_status", [
  "requested",
  "confirmed",
  "reschedule_pending", // NEW
  "completed",
  "cancelled",
]);

// sessions table — additive, all nullable (no backfill needed):
proposedStartsAt:     timestamp("proposed_starts_at"),
proposedEndsAt:       timestamp("proposed_ends_at"),
rescheduleProposedBy: text("reschedule_proposed_by").references(() => users.id),
```

- Additive + nullable ⇒ a clean generated migration, no data backfill.
- `proposed*` hold the *candidate* time while a reschedule is in flight; they are
  cleared (set null) on accept, reject, or cancel. `startsAt`/`endsAt` remain the
  source of truth for the **committed** time until a proposal is accepted.
- `rescheduleProposedBy` records who proposed, so the API can require the *other*
  party to act (you can't accept your own proposal).

### 2. State machine

Today (`validTransitions` in
[`api/sessions/[id]/route.ts`](../../src/app/api/sessions/[id]/route.ts)):

```
requested  → confirmed | cancelled
confirmed  → completed | cancelled
```

Add reschedule transitions (only a **confirmed** session can be rescheduled):

```
confirmed            → reschedule_pending           (either party proposes a new time)
reschedule_pending   → confirmed                    (counterpart ACCEPTS → commit proposed time)
reschedule_pending   → confirmed                    (counterpart REJECTS → keep original time)
reschedule_pending   → cancelled                    (either party cancels outright)
```

- **Accept**: copy `proposed*` → `startsAt`/`endsAt`, clear `proposed*`, status
  back to `confirmed`.
- **Reject**: clear `proposed*`, status back to `confirmed`, original time intact.
- **One proposal at a time**: a session in `reschedule_pending` can't receive a
  second proposal until the first is resolved (the UI hides "propose" and shows
  accept/reject to the counterpart).

### 3. API

A reschedule is not a plain status flip (it carries times), so add an explicit
action rather than overloading the `status` PATCH. Proposed shape — a new verb on
the existing route:

```
PATCH /api/sessions/:id   { action: "reschedule_propose", startsAt, endsAt }
PATCH /api/sessions/:id   { action: "reschedule_accept" }
PATCH /api/sessions/:id   { action: "reschedule_reject" }
```

(Existing `{ status: … }` payloads keep working — the handler branches on
`action` vs `status`.) Server rules:

- **Authorization**: both participants may *propose*; only the **non-proposer**
  may accept/reject. Reuse the existing participant check.
- **Validation** (reuse booking's guards from
  [`api/sessions/route.ts`](../../src/app/api/sessions/route.ts)): proposed start
  must be in the future, end after start, and fall within the mentor's
  availability. Reject reschedules into the past or onto an already-booked slot.
- **Rate limit**: reuse `rateLimit` (10/min) already on the route.

### 4. Notifications & email

Mirror the booking pattern (magic-link tokens via
[`signEmailAction`](../../src/lib/email-tokens.ts), fire-and-forget `sendEmail`):

- On **propose** → email the counterpart a new `SessionRescheduleProposedEmail`
  with **Accept**/**Decline** buttons (signed action links, like Confirm/Decline
  on booking) + an in-app `action_required:reschedule` notification.
- On **accept** → `SessionRescheduledEmail` (or reuse `SessionConfirmedEmail`
  with the new time) to the proposer; resolve the in-app action.
- On **reject** → a short "reschedule declined, original time stands" notice.

All new email templates use the canonical-origin logo just shipped (PNG), so the
logo renders.

### 5. UI

Replace the fake `handleReschedule` in
[`actions.tsx`](../../src/app/(platform)/session/[id]/actions.tsx) with the real
flow:

- **Confirmed session**: "Reschedule" opens a time picker (reuse the booking
  form's slot UI) → calls `reschedule_propose`. Available to **both** roles.
- **reschedule_pending**, you proposed: show "Waiting for {partner} to accept the
  new time" + a way to withdraw (→ reject).
- **reschedule_pending**, counterpart proposed: show old → new time and
  **Accept** / **Decline** buttons.
- Surface the pending state on the sessions list and dashboard "next session"
  (it should not look like a normal confirmed booking).

## Alternatives considered

- **Status quo (cancel + rebook).** Rejected — it's the thing this RFC exists to
  fix: loses notes/goals, one-sided, pollutes the cancellation record.
- **Clone the session row** (copy notes/goals/feedback into a new id on
  reschedule). Rejected — duplicates data, breaks the stable session id that
  notes/feedback FK to, and complicates history. Keeping one row is simpler and
  correct.
- **No schema change; encode the proposed time in a side table or in
  `cancelReason`.** Rejected — a side table is more moving parts than three
  nullable columns; overloading `cancelReason` is a hack. The proposed time is
  first-class session state.
- **Full calendar-style negotiation** (propose multiple candidate slots, counter-
  propose, etc.). Rejected as overkill for v1 — one proposed time with
  accept/reject covers the real need; multi-slot can be a later RFC if asked for.
- **Mentor-only reschedule.** Rejected — both sides have scheduling conflicts;
  symmetric propose/accept is barely more code and far more useful.

## Risks & trade-offs

- **Schema migration.** Enum value + three columns. Additive and nullable, so low
  risk, but it is a real migration (generated, reviewed, not `push`ed — ADR-0003).
- **Double-booking race.** Two proposals/bookings could target the same slot
  between validation and commit. Mitigation: re-check slot availability at
  **accept** time, not just propose time; low volume makes this rare (note the
  ceiling, upgrade path = a unique constraint / transaction if it bites).
- **State sprawl.** A fifth status complicates every place that switches on
  status (badges, lists, filters). Mitigation: the component inventory + status
  tokens make this mechanical; audit all `status ===` sites.
- **Notification noise.** Reschedule adds another email/notification type;
  keep copy terse and fire-and-forget so it never blocks the flow.
- **Reversibility.** Medium. The columns/enum are additive (easy to stop using),
  but once sessions carry `reschedule_pending` rows, removing the status needs a
  data migration. Worth getting the state model right here.

## Open questions

1. **Reject semantics.** On decline, revert to the **original confirmed time**
   (proposed here), or treat decline as a cancel? Leaning revert — declining a
   *new* time shouldn't kill the *existing* booking.
2. **Pending expiry.** Should a `reschedule_pending` proposal auto-expire (e.g.
   if the proposed time passes with no response, revert to confirmed)? The
   existing `auto-complete` cron is a natural home if so.
3. **Availability strictness.** Must a reschedule land inside the mentor's
   published availability (like booking), or may participants agree on any
   mutually-chosen future time? Booking enforces availability; reschedule could
   be looser since both parties are actively negotiating.
4. **Which states are reschedulable.** Proposal limits it to `confirmed`. Should
   a still-`requested` session be "reschedulable", or does the requester just
   cancel and rebook while it's not yet confirmed? (Leaning: requested → just
   rebook; only confirmed sessions reschedule.)

## Outcome

_To be filled on acceptance — link the resulting ADR and implementation PRs. No
feature code or migration ships before the ADR is recorded (AGENTS.md §2)._
