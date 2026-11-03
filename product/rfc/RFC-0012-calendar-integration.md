# RFC-0012: Calendar integration (subscription feed + Google event push)

- **Status:** Accepted (2026-10-25)
- **Author:** natos
- **Created:** 2026-07-19 · **Amended:** 2026-10-25 (see *Revision history*)
- **Discipline:** Engineering (which hat decides; Product co-signs the UX)
- **Tracking issue:** [#142](https://github.com/grasshopper-protocol/grsshppr/issues/142)

## Summary

Get confirmed Grasshopper sessions into the calendars people actually look at,
in two independently shippable phases:

- **Phase 0 — Tier A: subscription feed (everyone).** A private, per-user
  `.ics` subscription URL listing the user's confirmed sessions. Google,
  Outlook and Apple Calendar poll it. No OAuth, no third-party grants, one small
  table.
- **Phase 1 — Tier B: Google event push (opt-in).** A user connects their
  Google Calendar; when a session is confirmed or cancelled, Grasshopper creates
  or deletes a real event on that user's own calendar, with a Google Meet link
  generated once per session.

Calendar access is a **connection decoupled from login**
([ADR-0014](../../decisions/ADR-0014-calendar-connection-auth-boundary.md)): a
GitHub or passkey user can still connect Google Calendar. Provider calls are
**thin REST over `fetch`**, so this RFC adds **no new dependencies**. Schema
change is four additive tables and one nullable column on `sessions`, shipped as
generated migrations ([ADR-0003](../../decisions/ADR-0003-schema-migrations.md)).

**Out of scope, recorded as direction:** Tier C (reading external free/busy to
block availability) and Microsoft 365. Both need their own RFC — see
*Direction: Tier C and Microsoft*.

## Motivation

Today the platform's only calendar touchpoint is a **one-shot ICS export**
([`api/sessions/[id]/ical/route.ts`](../../src/app/api/sessions/%5Bid%5D/ical/route.ts))
that a user must manually download and import per session. That leaves gaps:

- **Bookings don't live where people actually look.** A confirmed session exists
  only in Grasshopper and in whatever `.ics` the user remembered to import.
  Cancellations never propagate — the stale event just sits in the user's
  calendar. This causes no-shows and confusion.
- **No video link.** Each session needs an ad-hoc call link pasted into notes.
- **Grasshopper is blind to external commitments** (mentors get double-booked).
  This is real, but it is the expensive, always-on part (Tier C) and is deferred
  — see *Direction*.

The foundations exist: sessions are stored as offset-aware UTC instants
([ADR-0004](../../decisions/ADR-0004-timezone-handling.md)), which is the wire
format both ICS and the Google Calendar API expect, and the existing ICS export
already produces stable per-session `UID`s.

Doing nothing keeps calendars and bookings out of sync and leaves the most
common "does it put the meeting in my calendar?" expectation unmet.

### Why phase it this way

The first draft specified Tier B and Tier C together, for Google and Microsoft.
An audit of the draft against the code (2026-10-25) found that the
durability story for Tier C rests on a frequent cron the hosted deployment
cannot run (Vercel Hobby allows **daily** cron jobs only), and that Tier C is an
always-on subsystem (push channels, renewal, sync tokens) whose cost is best
judged after Tier B has real users. Tier A solves the most visible problem for
**every** user at near-zero risk; Tier B adds write-back and video links for
those who opt in. Each phase is useful on its own.

## Proposal

### 0. Scope

| In this RFC | Deferred to a follow-up RFC |
|---|---|
| Tier A subscription feed (all users) | Tier C free/busy → availability blocking |
| Tier B event push, **Google only** | Microsoft 365 / Outlook (Tier B and C) |
| Google Meet link per session | Choosing a non-primary write calendar |
| One calendar connection per user | Multiple connections per user |

Reschedule push is not needed: today a reschedule is cancel + rebook, which
this design handles as a delete plus a new event. When
[RFC-0007](RFC-0007-session-reschedule.md) lands a true reschedule, it enqueues
the same reconcile (§5) and the existing event moves.

### 1. Tier A — subscription feed

A per-user secret URL, `GET /api/calendar/feed/<token>.ics`, returns an
`VCALENDAR` of that user's **confirmed and completed** sessions from 30 days
ago to 90 days ahead. Cancelled sessions are omitted, so subscribing clients
remove them on their next poll.

- **Token.** 32 random bytes, base64url. Only its SHA-256 hash is stored
  (`calendar_feeds.token_hash`); the URL is shown once on creation, with
  *Copy* and *Regenerate* (regenerate invalidates the old URL). The URL is a
  bearer secret, and the UI copy says so.
- **Content minimisation.** Same `UID` scheme as the one-shot export
  (`session-<id>@grsshppr.org`), title naming the partner, a link to the
  session page and the video link when present. **No email addresses, no goal
  titles** — subscribed calendars are often shared with colleagues.
- **Shared ICS builder.** The existing export's builder moves into a pure
  `src/lib/ical.ts` used by both routes, with full RFC 5545 escaping
  (backslash, `;`, `,`, newlines) and 75-octet line folding. The current
  `escapeICalText` escapes only `,` and `;`, so a name containing a newline can
  inject ICS properties; the extraction fixes that.
- **Hardening.** Unauthenticated by design (calendar clients can't log in), so
  it is rate-limited, returns `404` for unknown tokens, and sets
  `Cache-Control: private` and `X-Robots-Tag: noindex`.
- **Refresh lag.** Clients poll on their own schedule (Google: hours). The UI
  says so; Tier B is the answer for anyone who needs immediacy.

Tier A needs no external configuration and ships **enabled**.

### 2. Tier B — connection model (Google, decoupled from login)

A calendar connection is **not** the login identity
([ADR-0014](../../decisions/ADR-0014-calendar-connection-auth-boundary.md)
decision 1). Calendar tokens are never stored in Better Auth's `accounts` table.

- **Separate consent flow.** "Connect Google Calendar" starts a dedicated OAuth
  authorization-code flow with **PKCE (S256)**, `access_type=offline`,
  `prompt=consent` and `include_granted_scopes=true`.
- **Scopes (least privilege).**
  `https://www.googleapis.com/auth/calendar.events.owned` — create, change and
  delete events **on calendars the user owns** — plus `openid email` to
  identify the connected account. This is narrower than `calendar.events`
  (which reaches every calendar the user can access) and is enough to write to
  `primary`. `calendar.freebusy` is **not** requested until a Tier C RFC is
  accepted; it would then be added by incremental authorisation.
- **Granular consent.** Google lets users untick individual scopes. The callback
  checks the granted `scope` string and refuses to store a connection without
  `calendar.events.owned`, showing a "permission needed" message instead.
- **Account identity.** `sub` and `email` come from the `id_token` returned by
  Google's token endpoint over TLS (no extra call).
- **One connection per user (v1).** Reconnecting replaces the connection.
  Events are always written to the user's **`primary`** calendar; no picker in
  v1.
- **We own the token lifecycle** (refresh, encryption, revocation) — Better
  Auth's social-login token handling is not used.

### 3. Data model (migration required)

Four additive tables and one nullable column. No backfill.

```ts
// Tier A — per-user subscription feed. Only the token hash is stored.
export const calendarFeeds = pgTable("calendar_feeds", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(), // sha256(token), hex
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Tier B — a connected external calendar account (decoupled from login).
export const calendarProviderEnum = pgEnum("calendar_provider", ["google"]);

export const calendarConnections = pgTable("calendar_connections", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique() // v1: one connection per user
    .references(() => users.id, { onDelete: "cascade" }),
  provider: calendarProviderEnum("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(), // id_token `sub`
  email: text("email"),
  // AES-256-GCM envelopes (§9), never plaintext.
  accessTokenEnc: text("access_token_enc").notNull(),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  accessTokenExpiresAt: timestamp("access_token_expires_at").notNull(),
  scope: text("scope").notNull(),
  writeTargetCalendarId: text("write_target_calendar_id")
    .notNull()
    .default("primary"), // no picker in v1
  status: text("status").notNull().default("active"), // active | error
  lastError: text("last_error"), // error code only — never tokens or bodies
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// One row per (session, connection) external event we created.
export const calendarEventLinks = pgTable(
  "calendar_event_links",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => calendarConnections.id, { onDelete: "cascade" }),
    externalEventId: text("external_event_id").notNull(),
    etag: text("etag"),
    lastSyncedAt: timestamp("last_synced_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.sessionId, t.connectionId)],
);

// Durable "please reconcile this pair" queue. One row per (session,
// connection) — it carries no operation; the drain reads current state.
export const calendarOutbox = pgTable(
  "calendar_outbox",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    connectionId: text("connection_id")
      .notNull()
      .references(() => calendarConnections.id, { onDelete: "cascade" }),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at").notNull().defaultNow(),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique().on(t.sessionId, t.connectionId),
    index().on(t.nextAttemptAt),
  ],
);

// On `sessions` (existing table, additive nullable column):
videoUrl: text("video_url"), // Meet link, set by the host connection's event
```

Notes:

- **Reconcile, not operations.** The first draft queued `upsert`/`delete`
  operations keyed by `(session, connection, op)`. That allowed a pending
  upsert and a pending delete to coexist, so a fast confirm-then-cancel could
  run the delete first (no-op) and the upsert second, orphaning an event. The
  outbox now holds a single "reconcile" row per pair and the drain derives the
  action from the session's **current** status (§5), so ordering bugs can't
  occur.
- **`video_url` lives on the session**, not the event link, because every
  surface (session page, emails, Tier A feed, the partner's event) needs it and
  it must survive a disconnect.
- **Two events per session by design.** With both parties connected there are
  two `calendar_event_links`, each on that user's own calendar under that
  user's own grant.

### 4. Provider client (thin REST)

`src/modules/calendar/google.ts` wraps the handful of Google endpoints Tier B
needs, using `fetch` and `zod` (already a dependency) to validate responses:

| Purpose | Endpoint |
|---|---|
| Code exchange, refresh | `POST https://oauth2.googleapis.com/token` |
| Revoke | `POST https://oauth2.googleapis.com/revoke` |
| Create event | `POST /calendar/v3/calendars/primary/events?conferenceDataVersion=1` |
| Update event | `PATCH /calendar/v3/calendars/primary/events/{id}?conferenceDataVersion=1` |
| Delete event | `DELETE /calendar/v3/calendars/primary/events/{id}` |

The interface is kept small and provider-shaped so Microsoft can implement it
later without changing the drain:

```ts
export interface CalendarProvider {
  readonly id: "google";
  authorizeUrl(p: { state: string; codeChallenge: string; redirectUri: string }): string;
  exchangeCode(p: { code: string; codeVerifier: string; redirectUri: string }): Promise<TokenSet>;
  refresh(refreshToken: string): Promise<TokenSet>;
  revoke(token: string): Promise<void>;
  upsertEvent(accessToken: string, e: EventInput): Promise<{ id: string; etag: string; videoUrl?: string }>;
  deleteEvent(accessToken: string, externalEventId: string): Promise<void>; // 404/410 = success
}
```

All calls go to fixed Google hosts; no user-supplied URLs.

**Why not the SDK.** `googleapis` is ~246 MB unpacked. The scoped
`@googleapis/calendar` is small but pulls in `googleapis-common` →
`google-auth-library` → `gaxios`, `gcp-metadata`, `jws` and more, and its auth
client is designed to own the token lifecycle that ADR-0014 says we own. Six
REST calls don't justify a new supply-chain surface
([ADR-0010](../../decisions/ADR-0010-supply-chain-hardening.md)).

### 5. Event push engine — Tier B

**Seam (module boundary).** Calendar is an opt-in module in
`src/modules/calendar/`, with pure logic in `src/lib/calendar/`. Core never
imports it ([ENGINEERING.md](../../ENGINEERING.md) module rules). Composition
happens at the API layer: a shared `transitionSession()` helper used by **both**
status-changing routes —
[`PATCH /api/sessions/[id]`](../../src/app/api/sessions/%5Bid%5D/route.ts) and the
email one-click
[`action` route](../../src/app/api/sessions/%5Bid%5D/action/route.ts) — runs
`updateSessionStatus` (which gains an optional transaction argument) and, when
calendar is enabled, inserts an outbox row for each active connection of the
mentor and mentee **in the same transaction**.

**Reconcile rules.** The drain reads the session, connection and any existing
link, then:

| Session status | Link exists? | Action |
|---|---|---|
| `confirmed` | no | create event → insert link |
| `confirmed` | yes | update event (time, title, video link) |
| `cancelled` | yes | delete event (404/410 counts as done) → delete link |
| `cancelled` | no | nothing |
| `requested`, `completed` | — | nothing (past events stay in place) |

On success the outbox row is deleted.

**Execution.**

- **Inline first, cron as backstop.** After commit, the route schedules a drain
  for that session with Next's `after()`, so it runs after the response is sent
  and is not killed by the function returning. The daily cron
  (`GET /api/calendar/drain`, `CRON_SECRET` required, fail-closed) drains
  anything left over. On Vercel Hobby the backstop is daily (±59 min); the
  inline drain handles the common case within seconds.
- **No double processing.** The drain claims rows with
  `FOR UPDATE SKIP LOCKED` and pushes `next_attempt_at` forward as a lease, so
  the inline drain and the cron can't work the same row at once.
- **Idempotent creates.** Google accepts a client-supplied event `id`
  (base32hex). We derive it deterministically from `sha256(sessionId +
  connectionId)` as hex (a subset of base32hex). If a create succeeded at
  Google but our link insert failed, the retry gets `409` and switches to
  update — no duplicate event.
- **Failures.** Transient errors (429, 5xx, network) increment `attempts` and
  set `next_attempt_at` to the next run; after 5 attempts the row is parked
  (skipped, kept for inspection). An auth failure (`invalid_grant`, or 401 after
  refresh) flips the connection to `status = error`, sends a reconnect
  notification, and leaves its rows queued; reconnecting re-drains them. A
  Google outage never fails a booking.
- **Backfill on connect.** Connecting (or reconnecting) enqueues the user's
  upcoming confirmed sessions, so existing bookings appear straight away.

**Event content — privacy first.**

- **No attendees.** Each participant gets their own event on their own
  calendar; neither event lists the other person's email. Google therefore
  sends no invitations, and no contact details are written into a third-party
  calendar.
- Title names the partner; description holds the session page link and the
  video link. **No goals, no notes, no emails.**
- `visibility: "private"`, so colleagues who can see a shared work calendar see
  only "busy".
- Reminders use the calendar's defaults (`reminders.useDefault: true`).
- **Timezone parity.** `start`/`end` carry UTC instants with
  `timeZone: "UTC"`, reusing the ADR-0004 wire format; clients render in the
  user's own zone.

**Video link (Google Meet).** One Meet per session, created on the **host**
connection's event: the mentor's connection if active, otherwise the mentee's.
The host event is created with `conferenceData.createRequest` (`requestId` =
session id, `conferenceSolutionKey.type = "hangoutsMeet"`). On success the drain
writes `sessions.video_url` and enqueues a reconcile for the other connection,
whose event is then updated to include the link. If neither participant is
connected, there is no video link (as today). On cancellation `video_url` is
cleared.

### 6. API and UI

**Routes** (under `src/app/api/calendar/`):

```
POST /api/calendar/feed                 → create or regenerate the feed token (returns URL once)
DELETE /api/calendar/feed               → turn the feed off
GET  /api/calendar/feed/[file]          → the .ics feed ("<token>.ics"), public, rate-limited
GET  /api/calendar/connect/google       → start OAuth (PKCE + signed state cookie)
GET  /api/calendar/callback/google      → exchange code, store connection, backfill
POST /api/calendar/disconnect           → revoke at Google, delete connection
GET  /api/calendar/drain                → cron backstop (CRON_SECRET, fail-closed)
```

Every route except the feed and drain requires a session and acts only on
`session.user.id` — there are no connection ids in URLs. Mutating routes use
the existing `rateLimit` helper.

**Disconnect** removes the user's *upcoming* session events (best effort,
time-boxed), revokes at Google and deletes the connection (cascading links and
outbox rows). Past events stay. Unsynced upcoming events would go stale: a later
cancellation would never reach them. Connecting a different Google account
disconnects the old one first. **Account deletion** composes the same revoke before
`deleteProfile()` runs.

**UI** — a "Calendar" section in settings:

- **Subscribe** (Tier A): explanation, *Create link* → copyable URL shown once,
  *Regenerate*, *Turn off*. Note that clients refresh on their own schedule.
- **Connect Google Calendar** (Tier B, only when enabled): connect button;
  when connected, the account email, status and *Disconnect*. A short line
  stating what we write (your own events, no contact details) and that
  disconnecting removes upcoming session events.
- **Reconnect nudge** when `status = error`, via the existing notification bell
  as an `action` notification.
- **Session page** shows a *Join video call* link when `video_url` is set.

UX copy and layout follow [DESIGN.md](../../DESIGN.md); Design co-signs the
settings and session-page changes in their PRs.

### 7. Notifications and email

- **Reconnect needed** notification when a connection enters `error`.
- The **session-confirmed email** is sent from the same `after()` callback,
  after the inline drain, so it includes the Meet link when one was created.
  If the inline drain failed, the email goes out without it and the link
  appears on the session page once the backstop runs.
- The one-shot ICS export stays for everyone.

### 8. Config, env, dependencies

| Variable | Purpose |
|---|---|
| `CALENDAR_SYNC_ENABLED` | Gates Tier B. Off unless `true`. |
| `GOOGLE_CALENDAR_CLIENT_ID` / `_SECRET` | OAuth client (may be the same Google project as login). |
| `CALENDAR_TOKEN_ENC_KEY` | Current AES-256-GCM key, 32 bytes base64. |
| `CALENDAR_TOKEN_ENC_KEY_PREVIOUS` | Optional, decrypt-only, during rotation. |

- Tier B is enabled only when the flag is `true` **and** the client credentials
  and a valid 32-byte key are present. Otherwise the connect UI is hidden and
  Tier B routes return `404` — self-hosters and local dev run without it, as
  with Resend today. A malformed key fails closed at startup of the module.
- Redirect URI: `${BETTER_AUTH_URL}/api/calendar/callback/google`.
- `vercel.json` gains a daily `GET /api/calendar/drain` cron.
- **No new dependencies.**

### 9. Security model

Refresh tokens with calendar write scope are the most sensitive secrets in the
system.

- **Encryption at rest** (ADR-0014 decisions 5–6). AES-256-GCM, random 12-byte
  nonce per value, envelope `<keyId>.<iv>.<tag>.<ciphertext>` (base64url), where
  `keyId` is the first 8 bytes of `sha256(key)` in hex. The connection id and
  column name are bound as additional authenticated data, so ciphertexts
  can't be swapped between rows or columns. Values are re-encrypted with the
  current key on each token refresh (lazy rotation); see
  [SECURITY.md](../../SECURITY.md).
- **OAuth handshake.** PKCE S256; `state` is 32 random bytes. The state,
  PKCE verifier, user id and a 10-minute expiry live in an HMAC-signed,
  `httpOnly`, `Secure`, `SameSite=Lax` cookie. The signing key is derived from
  `BETTER_AUTH_SECRET` with HKDF and a calendar-specific label, so it is not
  shared with email tokens. The callback requires a session, verifies the
  signature with `timingSafeEqual`, and checks expiry, state equality and that
  the cookie's user is the session user.
- **Scope minimisation.** `calendar.events.owned` only; checked on callback.
- **Write-side minimisation** (ADR-0014 decision 4b). No attendees or emails,
  no goals or notes in events, private visibility.
- **Revoke on disconnect and account deletion.**
- **No secrets in logs or errors.** `lastError` stores an error code or class
  only; never tokens, request bodies or event content.
- **Feed tokens** stored as hashes, regenerable, rate-limited lookups.
- **Cron routes fail closed** when `CRON_SECRET` is unset.
- **SSRF.** Provider calls go to fixed Google hosts only.

### 10. Testing plan (ADR-0011)

Pure helpers in `src/lib/calendar/` and `src/lib/ical.ts`, Node test runner,
matching [`tests/booking-dates.test.js`](../../tests/booking-dates.test.js):

- **ICS builder:** escaping of `\`, `;`, `,` and newlines (including an
  injection attempt in a name), line folding, stable `UID`s, cancelled sessions
  excluded from the feed window.
- **Feed token:** generation, hashing, lookup by hash.
- **Token envelope:** round trip; tamper detection (iv, tag, ciphertext, AAD);
  decrypt with previous key; re-encrypt to current key; malformed key rejected.
- **State cookie:** valid; expired; bad signature; wrong user; state mismatch.
- **Reconcile decision:** every row of the §5 table.
- **Event payload builder:** no attendees, no emails, no goals; private
  visibility; UTC instants with `timeZone: "UTC"`; conference request only on
  the host; deterministic event id is valid base32hex.
- **Video host selection:** mentor preferred, mentee fallback, none.
- **Retry policy:** attempts and next-attempt calculation; parking after 5;
  auth errors classified separately from transient ones.
- **Granted-scope check:** missing `calendar.events.owned` is rejected.

Query-layer behaviour (outbox coalescing on the unique pair, `SKIP LOCKED`
claim) is exercised against a fake provider in an integration test where
practical. Coverage gate stays green.

### 11. Rollout

**Prerequisites (separate bug issues, not part of this RFC):** [#138](https://github.com/grasshopper-protocol/grsshppr/issues/138) — the existing
cron routes export only `POST` while Vercel invokes `GET`, and allow
unauthenticated calls when `CRON_SECRET` is unset. Fix both before adding a
third cron. _Fixed by #155 (merged 2026-10-25)._

**Phase 0 — Tier A**
1. Extract `src/lib/ical.ts` with full escaping; switch the one-shot export to it.
2. `calendar_feeds` migration, feed routes, settings UI.

**Phase 1 — Google Tier B (dark)**
3. Pure helpers: envelope crypto, state cookie, reconcile decision, payload
   builder, retry policy.
4. Migration (connections, links, outbox, `sessions.video_url`) and the
   `transitionSession()` seam.
5. Connect / callback / disconnect and settings UI behind `CALENDAR_SYNC_ENABLED`.
6. Drain (inline + cron), Meet links, confirmation email ordering.
7. Soak with Google "test users" on production, with `CALENDAR_SYNC_ALLOWED_USERS`
   limiting the Connect button to them (anyone else would hit Google's
   "access blocked" screen while the app is in Testing mode). Note: in Testing
   mode Google refresh tokens expire after 7 days, so testers reconnect weekly.
8. Submit Google OAuth verification (needs the working flow for the demo video;
   checklist, scope justification and video shot list in
   [product/google-oauth-verification.md](../google-oauth-verification.md));
   enable on the hosted deployment once verified.

## Direction: Tier C and Microsoft (follow-up RFC)

Recorded so the research isn't lost; **not** accepted by this RFC.

- **Tier C (free/busy).** The benchmark research
  ([product/research/calendar-integration-benchmark.md](../research/calendar-integration-benchmark.md))
  stands: cache busy intervals per selected calendar, keep them fresh with
  provider push (Google `events.watch`, Graph `subscriptions`, basic
  notifications ~7 days), incremental sync tokens with a full-resync fallback on
  `410`/expired `deltaLink`, a webhook that only stamps "sync due", a
  reconciliation sweep for orphaned channels, and **busy intervals only** at
  rest (ADR-0014 decision 4). Read via Google `freebusy.query` and Microsoft
  per-calendar `calendarView` (`getSchedule` is mailbox-scoped).
- **The constraint that blocks it today.** Correctness depends on a frequent
  backstop, and Hobby cron is daily — a 24-hour stale busy cache is not an
  acceptable double-booking window. The follow-up RFC must choose between a
  paid plan, an on-read refresh (refresh a stale cache in `after()` when
  availability is requested), or another trigger.
- **Slot subtraction** needs an interval-overlap helper in `src/lib`; the
  availability route today matches exact start times only.
- **Microsoft** joins as a second `CalendarProvider` (Graph REST,
  `Calendars.ReadWrite` + `offline_access`; check whether Teams links via
  `isOnlineMeeting` need `OnlineMeetings.ReadWrite` at all). Connection-only,
  per ADR-0014 decision 2.

## Alternatives considered

- **Tier B + C together, both providers (first draft).** Superseded by this
  amendment: too much always-on surface before any of it is proven, and Tier C
  depends on cron frequency the hosted plan doesn't have.
- **Tier A only.** Cheap and universal, but read-only: no video links, refresh
  lag of hours. Kept as Phase 0 and as the fallback for unconnected users.
- **Unified calendar API (Nylas, Cronofy).** Rejected: paid SaaS in the trust
  path, users' calendar data egressed to a broker, lock-in — against the
  project's open, self-hostable ethos.
- **Reuse Better Auth login tokens.** Rejected (ADR-0014 option A): couples
  calendar to the login provider and widens the login row's blast radius.
- **CalDAV.** Rejected: partial Google support, no Meet links.
- **One shared event with the partner as attendee.** Rejected: writes the
  partner's email into a third-party calendar, sends provider invitations, and
  muddles ownership on cancel. Each participant owning their own event, with no
  attendees, protects contact details.
- **`googleapis` / `@googleapis/calendar` SDK.** Rejected for v1 (see §4):
  246 MB or a multi-package auth chain for six REST calls, and an auth client
  that wants to own tokens we must own. Revisit if the REST surface grows past
  what's comfortable to maintain.
- **Operation-based outbox (`upsert`/`delete` rows).** Rejected in favour of
  reconcile rows: op rows allowed out-of-order execution and orphaned events.
- **Fire-and-forget without `after()`.** Rejected: on serverless, work after
  the response may be killed; `after()` is the supported way to finish it.
- **Broader scope `calendar.events`.** Rejected: reaches every calendar the
  user can access; `calendar.events.owned` covers writing to `primary`.

## Risks and trade-offs

- **Google OAuth verification.** Calendar scopes need verification before
  public hosted use; it needs a verified domain, privacy policy and a demo
  video, and can take weeks. Mitigation: build dark, soak with test users,
  submit as soon as the flow works.
- **`calendar.events.owned` + Meet.** Not yet tested that conference creation
  works under the narrower scope. Verified in step 5; fallback is
  `calendar.events`, recorded as an ADR-0014 amendment if needed.
- **Daily backstop.** If the inline drain fails, an event can be up to a day
  late. Acceptable for Tier B; the inline path covers the common case.
- **Feed URL leakage.** A leaked feed URL exposes session times and partner
  names (no emails, no goals). Mitigation: regenerate, minimised content,
  rate limits.
- **Token security.** Mitigated by envelope encryption with AAD, scope
  minimisation, revoke on disconnect, no secrets in logs (§9).
- **Reversibility.** Additive tables; turning Tier B off means revoking
  connections. Past events stay in users' calendars; upcoming ones are removed
  when a connection is disconnected.

## Open questions

1. **Google verification path — resolved.** One verified app for hosted
   Grasshopper; self-hosters register their own client. Test users pre-verification.
2. **Write target — resolved.** `primary` only in v1.
3. **Video link owner — resolved.** Mentor's connection, mentee's as fallback;
   stored on `sessions.video_url`.
4. **Attendees — resolved.** None; each participant owns their own event.
5. **SDK vs REST — resolved.** Thin REST, no new dependencies.
6. **Cron cadence — resolved.** Daily backstop (Hobby) plus inline `after()` drain.
7. **To verify during build:** that Meet creation works under
   `calendar.events.owned`, and the scope's sensitivity class in the Google
   Cloud console (it determines the verification track).

## Gaps from the benchmark research

| Gap | Status in this RFC |
|---|---|
| G1 durable write queue | Adopted: reconcile outbox + `after()` + daily cron (§5) |
| G2 re-sync backstop | Deferred with Tier C |
| G3 sync-token invalidation | Deferred with Tier C |
| G4 multiple read calendars | Deferred with Tier C |
| G5 webhook abuse surface | Deferred with Tier C (no webhooks in this RFC) |
| G6 recurring/all-day events | Deferred with Tier C |
| G7 key rotation | Adopted: key-id envelope, lazy re-encryption (§9) |
| G8 timezone parity | Adopted: UTC instants, `timeZone: "UTC"` (§5) |
| G9 orphaned channels | Deferred with Tier C; disconnect/deletion revoke adopted (§6) |

## Revision history

- **2026-07-19** — First draft: Tier B + C, Google + Microsoft.
- **2026-10-25** — Amended before acceptance after an audit against the code:
  narrowed to Tier A + Google Tier B; Tier C and Microsoft moved to *Direction*;
  reconcile outbox replaces op outbox; no attendees; `video_url` on `sessions`;
  thin REST (no dependencies); `calendar.events.owned` scope; PKCE; AAD on
  token envelopes; daily cron + `after()`; ICS escaping fix.
- **2026-10-26** — Amended after the UX, product and engineering reviews of the
  Phase 1 build: disconnecting (and account deletion, and switching Google
  accounts) removes *upcoming* events instead of leaving them to go stale;
  sync work is queued for broken connections too, so changes made during an
  outage run after reconnecting; the outbox gets a separate lock column
  ([ADR-0022](../../decisions/ADR-0022-outbox-lock-column.md), #194). Meet
  creation confirmed working under `calendar.events.owned` in a live test, so
  the `calendar.events` fallback isn't needed.

## Outcome

Accepted 2026-10-25 by natos (sole maintainer; lazy consensus per
[GOVERNANCE.md](../../governance/GOVERNANCE.md)). Decision record:
[ADR-0014](../../decisions/ADR-0014-calendar-connection-auth-boundary.md).
Accepted in #144 (docs only). Tracked in
[#142](https://github.com/grasshopper-protocol/grsshppr/issues/142).
Implementation: Phase 0 step 1 (shared ICS builder) #177; step 2 (feed,
`calendar_feeds`, Settings → Calendar) — see the PR for #142.
