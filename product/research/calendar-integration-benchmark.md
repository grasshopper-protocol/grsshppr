# Calendar integration — benchmark & best-practices research

> Research artifact backing [RFC-0012](../rfc/RFC-0012-calendar-integration.md)
> and [ADR-0014](../../decisions/ADR-0014-calendar-connection-auth-boundary.md).
> Not a decision record — this is the evidence and the reasoning that feeds them.
> Sources are primary provider docs and the closest open-source benchmark (Cal.com),
> captured 2026-07-20.

## 1. Why these benchmarks

- **Cal.com / Cal.diy** — the closest open-source analogue: a Next.js + Postgres
  scheduling platform that syncs Google + Microsoft calendars two ways. It is the
  single best "how does a serious OSS product actually do this" reference.
- **Google Calendar API** and **Microsoft Graph** — the two providers in scope;
  their own docs define the hard constraints we must design around.

The goal: validate (or correct) the RFC's architecture against how this is really
done, and surface anything the RFC missed.

---

## 2. Google Calendar API — verified constraints

**Scopes** (from the Calendar API auth reference):
- `https://www.googleapis.com/auth/calendar.events` — view & edit events (write).
- `https://www.googleapis.com/auth/calendar.freebusy` — view availability only.
- `https://www.googleapis.com/auth/calendar.events.owned` — narrower: events on
  calendars the user *owns*. Worth considering to minimise scope further.
- **Sensitive-scope verification:** "If your public application uses scopes that
  permit access to certain user data, it must complete a verification process."
  Confirms the RFC/ADR risk — public hosted use of `calendar.events` is gated on
  Google's OAuth verification. Self-host with own credentials sidesteps it.

**Push notifications (`watch` channels):**
- You register a channel per resource (`events.watch`) with an HTTPS `address`, a
  channel `id` (UUID), an optional `token` (echoed back as `X-Goog-Channel-Token`
  for spoof-verification — docs explicitly say *don't* put sensitive data / OAuth
  tokens in it), and an `expiration`.
- **No auto-renew.** "Currently, there's no automatic way to renew a notification
  channel. When a channel is close to its expiration, you must replace it by
  calling `watch` again" with a *new* unique `id`. Expect an overlap window where
  two channels are live. → **a renewal cron is mandatory, not optional.**
- **Notifications carry no body.** The POST only has `X-Goog-*` headers
  (`Resource-State`: `sync` | `exists` | `not_exists`). You must call the API
  again (incremental sync) to learn *what* changed. → the webhook is a trigger,
  never a data source. This exactly matches the RFC's "always re-sync server-side"
  rule.
- **Reliability caveat, verbatim:** "Notifications are not 100% reliable. Expect a
  small percentage of messages to get dropped… Make sure to handle these missing
  messages gracefully, so that the application still syncs even if no push
  messages are received." → **push is an optimisation; a periodic full/incremental
  re-sync is the correctness backstop.** The RFC's 28-day bounded window + cron is
  the right shape but must run even when webhooks are silent.
- HTTPS with a valid CA cert required (no self-signed) — fine on Vercel, a note
  for self-hosters.
- Respond `200/201/202/204/102` to ack; `500/502/503/504` triggers Google
  retry-with-backoff. Anything else = failure.

**Incremental sync (`syncToken`):**
- Initial full list → `nextSyncToken` (only on the last page if paginated).
- Subsequent list with `syncToken` returns only changes, **including deletions**
  (so we can remove busy blocks).
- `410 Gone` = token invalidated → wipe local store for that calendar and do a
  full re-sync. → store `syncToken` per connection (RFC already does) and handle
  410 explicitly.

**Video links:** create the event with `conferenceData` (+
`conferenceDataVersion=1`) to auto-provision a Google Meet link.

---

## 3. Microsoft Graph — verified constraints

**Scopes:** `Calendars.ReadWrite`, `offline_access` (refresh tokens),
`OnlineMeetings.ReadWrite` (Teams links). App registered **multitenant**
("Accounts in any organizational directory") per Cal.com's setup.

**Delta query (incremental sync)** — `/me/calendarView/delta?startDateTime=…&endDateTime=…`:
- Returns pages via `@odata.nextLink` (`$skipToken`); a final `@odata.deltaLink`
  (`$deltaToken`) signals the round is complete. Persist the `deltaLink` and use
  it to start the next round.
- The date range is **encoded in the token** — you don't resend it. This is the
  Graph analogue of Google's `syncToken` and maps onto the same
  `calendar_connections.syncToken` column (store the whole deltaLink).
- **Deletions** come back as `{ "@removed": { "reason": "deleted" } }` — needed to
  drop busy blocks.
- `calendarView/delta` is inherently **date-bounded**, which fits the RFC's
  28-day window naturally (Graph even requires the bound; unbounded event delta is
  beta-only).

**Subscriptions (webhooks):** Graph change notifications require a
`validationToken` echo handshake on creation and a `clientState` secret for
verification (the Graph equivalent of Google's channel token). **Verified against
the official v1.0 subscription docs:** the Outlook `event` (calendar) resource has
a max subscription lifetime of **10,080 minutes (~7 days) for basic notifications**,
dropping to **1,440 minutes (~1 day) for rich notifications** (those that include
resource data, which also require an `encryptionCertificate`). Any
`expirationDateTime` under 45 minutes is auto-raised to 45 minutes. Calendar
notification latency is avg < 1 min / max 3 min. Subscriptions **must be renewed**
before expiry — same cron requirement as Google, but a comfortable ~7-day window.
→ **Design consequence:** use **basic notifications** (id-only), never rich —
we always re-read free/busy server-side anyway, so resource data buys nothing and
costs a certificate + a 7×-shorter lifetime. `lifecycleNotificationUrl`
(`subscriptionRemoved` / `reauthorizationRequired` / `missed`) is a cheap add that
reinforces the G2 re-sync backstop. (Corrects the first draft's unverified "~3
days" guess.)

**Free/busy:** `POST /me/calendar/getSchedule` returns `scheduleInformation`
(busy/free/tentative/out-of-office) for a set of addresses over a window — a
first-class free/busy call, no need to read event contents. Reinforces the ADR's
"free/busy only, never event bodies" stance.

**Online meetings:** calendar exposes `allowedOnlineMeetingProviders` /
`defaultOnlineMeetingProvider` = `teamsForBusiness`; set the event
`isOnlineMeeting: true` to provision Teams.

---

## 4. Cal.com — how a real OSS product does it

The most important benchmark, because it has solved this in the same stack. What
Cal.com's setup and docs reveal:

- **Credentials are encrypted at rest with a dedicated symmetric key.**
  `CALENDSO_ENCRYPTION_KEY` is "32 bytes for AES256," generated with
  `openssl rand -base64 24`, and used to encrypt stored integration credentials.
  → **Strong precedent for ADR-0014's AEAD-at-rest decision and the
  `CALENDAR_TOKEN_ENC_KEY` env var.** We are not inventing a pattern; we're
  matching the category leader.
- **Calendar OAuth is decoupled from login OAuth — confirmed by their routes.**
  Login uses `/api/auth/callback/google`; the *calendar integration* uses a
  separate `/api/integrations/googlecalendar/callback` (and
  `/api/integrations/office365calendar/callback` for Microsoft). They are
  distinct OAuth flows with distinct redirect URIs. → **Directly validates the
  RFC/ADR "connection ≠ login" model**, including our
  `/api/calendar/connect|callback/:provider` route split.
- **"Destination calendar" vs "selected calendars"** are separate concepts in
  Cal.com: one calendar is where events are *written*, a set of calendars is what
  gets *read for conflicts*. → maps onto our `targetCalendarId` (write) and
  `syncBusyIntoAvailability` (read) fields; we may later need *multiple* read
  calendars per connection, not a single boolean (see Gaps).
- **Integrations are optional and config-gated**; absent credentials, the feature
  simply isn't available. → matches ADR-0014 "off by default, absent config =
  disabled."
- **Cron jobs** live in a dedicated directory and back scheduled work (token/
  channel maintenance). → confirms channel-renewal-as-cron is the norm.
- **Microsoft app is multitenant**; Google requires enabling the Calendar API +
  publishing the consent screen with the `calendar.events` scope. → operational
  checklist for our own app registrations.
- Provider spread (Google, Office365, Zoom, Webex, Daily…) is organised behind an
  **app-store abstraction** — the large-scale version of our `CalendarProvider`
  interface. Confirms the interface-per-provider approach scales.

---

## 5. Best practices distilled (and how RFC-0012 maps)

| Best practice (from sources) | Status in RFC-0012 / ADR-0014 |
|---|---|
| Encrypt provider tokens at rest with a dedicated AES key | ✅ `CALENDAR_TOKEN_ENC_KEY`, AEAD (matches Cal.com `CALENDSO_ENCRYPTION_KEY`) |
| Calendar OAuth **separate** from login OAuth (distinct callbacks) | ✅ decoupled connection model + `/api/calendar/*` routes (matches Cal.com) |
| Webhook = trigger only; always re-sync server-side | ✅ stated explicitly |
| Push is unreliable → periodic re-sync backstop | ✅ explicit webhook-independent cron backstop (G2), ~5-min cadence (RFC §5b) |
| Channels/subscriptions expire → renewal cron with overlap | ✅ renewal cron with overlap handling (RFC §5b) |
| Persist `syncToken` / `deltaLink`; handle `410 Gone` / expiry → full resync | ✅ 410/expired-deltaLink → clear + full windowed resync (G3, RFC §5b) |
| Read **free/busy only**, never event bodies (privacy) | ✅ ADR-0014 decision 4 (standing privacy boundary) |
| Minimise scope (`events` + `freebusy`; consider `events.owned`) | ✅ scopes chosen; `events.owned` worth evaluating |
| Idempotent writes keyed on stored external id + etag | ✅ `unique(sessionId, connectionId)` + etag |
| Fire-and-forget writes, never block booking | ✅ matches existing email pattern |
| Bounded sync window (Graph delta *requires* it) | ✅ 28-day horizon |
| Separate "write" calendar from "read" calendars | ✅ adopted in v1 — `writeTargetCalendarId` + `calendar_selected` set (G4) |

Net: the RFC's architecture holds up well against both provider docs and the
category-leading OSS implementation. The gaps are refinements, not redesigns.

---

## 6. Critique of RFC-0012's open questions (with recommendations)

Each open question, pressure-tested against the research:

1. **Google verification / self-host credentials.**
   *Recommendation:* Adopt Cal.com's proven split — a single verified Google app
   for hosted Grasshopper; self-hosters register their own OAuth client and drop
   credentials in env (feature stays dark without them). Pre-verification, use
   Google's "Test users" allowlist for a small beta. This is a solved pattern;
   downgrade from "open question" to "decided, mirror Cal.com."

2. **Which calendar to write to.**
   *Recommendation:* Default to `primary` for v1 (already the schema default); add
   a target-calendar picker later. But **split the concept now**: "write target"
   and "read-for-busy set" are different things in Cal.com and shouldn't collapse
   into one field long-term. Keep `targetCalendarId` for writes; plan a
   `selectedCalendarIds` set for reads (Gap G4).

3. **Whose event owns the video link.**
   *Recommendation:* Generate the meeting on the **mentor's** event (mentor is the
   stable host across a mentee's sessions), then copy the URL into the mentee's
   event and into the session record so email/ICS/unconnected users still get it.
   Store it in `calendar_event_links.videoUrl` (already present). Decns needed:
   what if the mentor is on Google and mentee on Microsoft (Meet link in a Teams
   calendar is fine — it's just a URL).

4. **Busy-block granularity.**
   *Recommendation:* Collapse to "busy" for v1, but **treat `tentative` and
   `outOfOffice` as busy** (conservative = never double-book). Graph's
   `getSchedule` and Google both expose these states; store only the interval, not
   the status, to keep the privacy promise. Revisit "tentative = free" only if
   users complain about over-blocking.

5. **Microsoft as a login provider.**
   *Recommendation:* Keep it **calendar-connection-only** (ADR-0014 decision 2).
   Cal.com treats Office365 calendar as an integration distinct from login; no
   need to touch the ADR-0002 login boundary. Defer login-with-Microsoft to its
   own ADR if ever requested.

6. **Retry durability on Vercel (cold starts).**
   *Recommendation:* Use a **persisted outbox row** keyed on the event-link, drained
   by the existing cron, rather than in-process retry — serverless functions can't
   be trusted to hold an in-memory retry queue across cold starts. This is the
   biggest correctness upgrade over the current "fire-and-forget + in-process
   retry" sketch and should be promoted into the RFC proposal (Gap G1).

---

## 7. Gaps surfaced by the research (not yet in the RFC)

- **G1 — Durable write queue / outbox.** Fire-and-forget is right for *latency*
  but insufficient for *durability* on serverless. Need a persisted
  `calendar_outbox` (or a status/attempt count on `calendar_event_links`) drained
  by cron, so a confirm that fails during a cold start isn't lost. **Correctness,
  should land in v1 of Tier B.**
- **G2 — Explicit re-sync backstop, independent of webhooks.** Google states
  notifications drop; Graph subscriptions can silently lapse. The cron must do a
  periodic incremental (or full) re-sync per connection *regardless* of whether a
  webhook arrived — not only renew channels. Make this an explicit requirement.
- **G3 — Sync-token invalidation handling.** Specify the `410 Gone` (Google) and
  expired-`deltaLink` (Graph) paths: clear stored token + busy blocks for the
  connection, run a full windowed re-sync. Currently unstated.
- **G4 — Multiple read calendars per connection — ADOPTED IN v1.** A single
  boolean over one calendar misses users whose conflicts live on secondary
  calendars. Cal.com models a *set* of selected calendars; the RFC now builds this
  in v1 — `writeTargetCalendarId` (Tier B write) + a `calendar_selected` child
  table (Tier C read set), with per-calendar sync/channel state and a fan-out cap.
  Chosen over deferral because primary-only genuinely double-books, and
  per-calendar sync state is the correct model regardless.
- **G5 — Webhook endpoint abuse surface.** Public `/api/calendar/webhook/:provider`
  receives unauthenticated POSTs. Needs: `clientState`/channel-token verification,
  the Graph `validationToken` echo, request size/rate limits, and fast 2xx ack
  (do the sync work async) so a burst can't exhaust serverless capacity.
- **G6 — Recurring & all-day events in busy calc.** Free/busy expansion of
  recurring series and all-day/multi-day events must be handled by the provider's
  free/busy endpoint (Google `freebusy`, Graph `getSchedule`) rather than naive
  event listing, to avoid mis-blocking. Prefer free/busy APIs over event delta for
  the *availability* read; reserve delta/watch for cache freshness.
  **(Superseded by §7b C1: `getSchedule` is mailbox-scoped, so Microsoft's
  per-calendar read uses `calendarView` instead.)**
- **G7 — Token encryption key rotation.** ADR-0014 says the key is rotatable but
  doesn't define *how* (versioned key id column? re-encrypt on next refresh?).
  Needs a short operational note in SECURITY.md before launch.
- **G8 — Double-write timezone parity.** Events are pushed as UTC instants
  (good, per ADR-0004), but provider payloads want `{ dateTime, timeZone }`.
  Confirm we send UTC instants with `timeZone: "UTC"` (both APIs accept this) so
  we never reintroduce the ADR-0004 class of bug.
- **G9 — Account deletion / GDPR teardown.** On user delete we revoke + unwatch +
  cascade rows, but must also confirm no orphaned provider-side channels remain
  (a channel outlives our row if unwatch fails). Add a reconciliation sweep in the
  cron for channels whose connection no longer exists.

---

## 7b. Post-G4 re-test against provider specs

After adopting the selected-calendars model (G4), the new definitions were
re-checked against the provider docs. One real correction and four notes:

- **C1 (correction, applied).** Microsoft `getSchedule` takes `schedules` = *"a
  collection of SMTP addresses of users, distribution lists, or resources"* — it
  is **mailbox-scoped, not per-calendar**. So it cannot supply per-*selected*-
  calendar free/busy. The correct per-calendar, recurrence-expanding read on
  Microsoft is `GET /me/calendars/{id}/calendarView` ("occurrences, exceptions and
  single instances"), i.e. `calendarView/delta`. Google's `freebusy.query` *is*
  per-calendar. G6 in the RFC was corrected to reflect this provider asymmetry.
- **C2 (note).** Google `freebusy.query` accepts **multiple** calendar ids in one
  request (batch per connection); Microsoft `calendarView` is per-calendar (no
  batch). The `CalendarProvider.freeBusy` interface stays per-calendar; the Google
  impl may batch internally.
- **C3 (applied).** Webhooks carry only the channel/subscription id, so
  `calendar_selected.channelId` is now unique + indexed for O(1) webhook→row
  lookup.
- **C4 (quota, comfortable).** Outlook `event` subscriptions cap at **1,000 per
  mailbox across all apps**; `getSchedule` returns `5006` if a slot holds >1,000
  entries; `calendarView` `$top` max 1,000 (paginated). The ≤10 selected-calendar
  cap sits far inside all three.
- **C5 (minor).** Our own pushed event lands on a watched calendar and will
  bounce back as a busy block — harmless (that time *is* busy, and the slot is
  already Grasshopper-booked), but the upsert must stay idempotent to absorb the
  self-notification churn.

---

## 8. Sources

- Google Calendar API — Push notifications:
  https://developers.google.com/workspace/calendar/api/guides/push
- Google Calendar API — Synchronize resources (sync tokens, 410):
  https://developers.google.com/workspace/calendar/api/guides/sync
- Google Calendar API — Choose scopes (sensitive-scope verification):
  https://developers.google.com/workspace/calendar/api/auth
- Microsoft Graph — Delta query for calendar view (skipToken/deltaToken, @removed):
  https://learn.microsoft.com/en-us/graph/delta-query-events
- Microsoft Graph — calendar resource (getSchedule, online meeting providers):
  https://learn.microsoft.com/en-us/graph/api/resources/calendar
- Microsoft Graph — subscription resource (verified calendar `event` max
  lifetime: ~7 days basic / ~1 day rich, clientState, encryptionCertificate):
  https://learn.microsoft.com/en-us/graph/api/resources/subscription
- Microsoft Graph — change notifications overview (subscription lifetime table,
  latency, lifecycle notifications):
  https://learn.microsoft.com/en-us/graph/change-notifications-overview
- Microsoft Graph — calendar: getSchedule (schedules = SMTP addresses,
  mailbox-scoped; 5006 over 1,000 entries):
  https://learn.microsoft.com/en-us/graph/api/calendar-getschedule
- Microsoft Graph — list calendarView (per-calendar, expands occurrences/
  exceptions; $top max 1,000):
  https://learn.microsoft.com/en-us/graph/api/calendar-list-calendarview
- Cal.com / Cal.diy — README (CALENDSO_ENCRYPTION_KEY, integration callbacks,
  Google/Microsoft setup, cron jobs): https://github.com/calcom/cal.com
- Cal.com developer docs: https://cal.com/docs/developing/introduction
