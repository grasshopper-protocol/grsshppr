# Post-mortem: booking failed and showed wrong-day slots across timezones

- **Date:** 2026-06-23
- **Severity:** High — booking (the core action) was broken for non-UTC users
- **Status:** Resolved
- **Resulting decision:** [ADR-0004 — Timezone handling](../decisions/ADR-0004-timezone-handling.md)

## What happened

A mentor set availability for **Monday**, but mentees in a positive-UTC zone
(SGT, UTC+8) saw the slots land on **Sunday**. Attempting to book returned a
generic "Something went wrong." Booking — the product's core action — was
effectively broken for anyone not on UTC.

## Impact

- Wrong-day availability shown to mentees in positive-UTC zones.
- Every booking POST from those users failed validation (HTTP 400).
- No data loss; the failure was at request time, before any write.

## Root cause

Two independent timezone faults compounded:

1. **Date rolled back a day.** The client computed the week-start date string
   with `Date.toISOString()`. In UTC+8, local midnight Monday is still Sunday in
   UTC, so the derived `YYYY-MM-DD` was off by one.
2. **Naive datetimes rejected by the API.** Generated slots were emitted as
   `YYYY-MM-DDTHH:mm:ss` with no offset. The booking endpoint validates with
   `z.string().datetime()`, which requires a `Z`/offset — so the POST always
   400'd.

## The fix

- Client derives calendar dates from **local** date parts via a `toDateStr()`
  helper, never from `toISOString()`.
- Availability generation (`api/availability/[userId]/route.ts`) now emits real
  **UTC instants** honoring the mentor's timezone via a `zonedTimeToUtc()`
  offset-correction (DST-tested). The client groups slots by local date for
  display.

## Lesson

Codified as [ADR-0004](../decisions/ADR-0004-timezone-handling.md):

1. Never derive a calendar date from `toISOString()` — build `YYYY-MM-DD` from
   local parts.
2. Slot wire format is always offset-aware ISO (a true UTC instant).

These two rules now apply to all date/slot code.
