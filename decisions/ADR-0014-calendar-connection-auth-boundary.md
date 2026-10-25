# ADR-0014: Calendar connection auth boundary & token security

- **Status:** Accepted
- **Date:** 2026-10-25 (drafted 2026-07-20; amended with RFC-0012 before acceptance)
- **Discipline:** Engineering
- **Source RFC:** [RFC-0012](../product/rfc/RFC-0012-calendar-integration.md)

## Context

[RFC-0012](../product/rfc/RFC-0012-calendar-integration.md) proposes connecting
users' external calendars (Google Calendar, Microsoft 365 / Outlook) to
Grasshopper for two-way booking sync. That work crosses a boundary already fixed
by an accepted decision:

- [ADR-0002](ADR-0002-passwordless-auth.md) fixes the **login** providers at
  Google, GitHub, and passkeys, states "no passwords anywhere," and requires an
  RFC to add any auth provider. It says nothing about **non-login OAuth grants**
  (e.g. calendar access), because none existed.

Calendar integration introduces three things ADR-0002 never contemplated:

1. **A new provider, Microsoft**, with OAuth infrastructure in the product.
2. **Long-lived OAuth grants with write scope** to a third-party resource
   (someone's calendar), including **refresh tokens** — a materially larger and
   longer-lived secret than a login session.
3. **The question of coupling**: do calendar tokens ride on the login identity
   (reuse Better Auth's `accounts` rows), or are they a separate concern?

Better Auth's `accounts` table already stores `access_token`, `refresh_token`,
`scope`, and `access_token_expires_at` ([schema.ts](../src/lib/db/schema.ts)),
but today the Google login grant requests only `openid email profile` with no
offline refresh token. Reusing that row for calendar scope would silently widen
the blast radius of the login identity and couple two different lifecycles.

This is a security-critical boundary and a new dependency surface, so the
decision is recorded here before any calendar code, migration, or dependency
ships (AGENTS.md §2). This ADR governs the **auth boundary and token security**;
the full feature design (data model, sync engine, webhooks) lives in RFC-0012.

## Options

**A. Reuse Better Auth login `accounts` rows for calendar tokens.**
- Pro: one token store, less code.
- Con: couples calendar access to the *login* provider — a GitHub-login or
  passkey user could never connect a Google calendar; can't hold two calendars;
  mixes a short login-scope lifecycle with a long write-scope one; widens what a
  leaked login row grants. Rejected.

**B. Introduce Microsoft as a full login provider now.**
- Pro: single OAuth app per provider; Microsoft sign-in as a bonus.
- Con: a real change to the ADR-0002 passwordless-login boundary that isn't
  needed for calendar sync; more surface to verify and secure than the goal
  requires. Rejected for now (kept as an explicit future decision).

**C. Use a calendar broker (Nylas / Cronofy) that holds tokens for us.**
- Pro: no token storage, one API for both providers, they handle refresh and
  webhooks.
- Con: a paid third-party SaaS in the trust path, users' calendar data egressed
  to a broker, and lock-in — against an open, self-hostable project. Rejected
  (see RFC-0012 Alternatives).

**D. Store calendar tokens plaintext in a dedicated table, rely on DB access
control.**
- Pro: simplest.
- Con: a DB dump or read-only leak yields live write access to users' calendars;
  fails the OWASP "sensitive data at rest" bar for a secret this powerful.
  Rejected.

**E. Decoupled, encrypted calendar *connection*, Microsoft as a connection-only
provider (chosen).** A calendar connection is a separate concept from the login
identity, stored in dedicated tables with tokens encrypted at rest; Microsoft is
introduced as a **calendar connection** provider, not a sign-in provider, so
ADR-0002's login boundary is preserved intact.

## Decision

Adopt **Option E**. Specifically:

1. **Calendar access is decoupled from login identity.** A "calendar connection"
   is a distinct grant, not the Better Auth login account. Any authenticated
   user — regardless of how they signed in (Google, GitHub, or passkey) — may
   connect one or more calendars. Calendar tokens are **never** stored in the
   Better Auth `accounts` table.

2. **Microsoft is introduced as a calendar-connection provider only, not a login
   provider.** ADR-0002's passwordless *login* boundary (Google / GitHub /
   passkey, no passwords) is unchanged. Adding Microsoft *sign-in* remains a
   separate future decision requiring its own ADR. This ADR **extends** ADR-0002's
   scope to cover non-login OAuth grants; it does not contradict or supersede it.

3. **Minimal, offline scopes, requested only when used.** Connections request
   the narrowest scopes the *shipped* tier needs, with offline access for
   refresh. A scope is added by incremental authorisation only when the tier
   that uses it is accepted:
   - Google, Tier B (RFC-0012): `calendar.events.owned` + `openid email`,
     `access_type=offline`, PKCE. If Meet creation proves to need
     `calendar.events`, that widening is recorded as an amendment here.
   - Google, Tier C (future RFC): add `calendar.freebusy`.
   - Microsoft Graph (future RFC): indicatively `Calendars.ReadWrite` +
     `offline_access`; confirm whether `OnlineMeetings.ReadWrite` is needed.

4. **Busy-only availability — a standing privacy boundary.** Tier C **persists and
   uses busy intervals only** (start/end instants). Event titles, bodies,
   attendees, and locations are **never stored and never used** for anything but
   computing "busy." The *read* mechanism differs by provider and this ADR is
   explicit about it:
   - **Google** exposes a per-calendar free/busy endpoint (`freebusy.query`) that
     returns intervals alone — we read nothing more.
   - **Microsoft** `getSchedule` is **mailbox-scoped** and cannot isolate a
     *selected secondary* calendar, so per-calendar availability is read via
     `calendarView`, which returns **full event objects**. We **discard
     everything except start/end at ingestion** and persist only the interval.

   So the guarantee is: **minimize at read where the provider's API allows it, and
   always minimize at store.** This read choice does **not** widen scope
   (`Calendars.ReadWrite` already covers `calendarView`). Widening what we
   *persist or use* beyond busy requires a new ADR — this is a promise to users,
   not an incidental implementation detail.

4b. **Write-side minimisation — a standing privacy boundary.** Events we write
   into a user's calendar carry **no attendees and no participant email
   addresses**, no goals and no notes, and are marked private. Each participant
   owns their own event under their own grant. Writing contact details or
   mentoring content into third-party calendars requires a new ADR.

5. **Tokens are encrypted at rest** with authenticated encryption
   (**AES-256-GCM**, random per-record nonce; the Cal.com project's
   `CALENDSO_ENCRYPTION_KEY`/AES-256 is the precedent). The connection id and
   column name are bound as additional authenticated data, so ciphertexts can't
   be swapped between rows. The key (`CALENDAR_TOKEN_ENC_KEY`) is env-provided
   and held only in memory at runtime; ciphertext lives in dedicated tables
   (`calendar_connections`), never plaintext columns. A DB dump alone does not
   yield usable tokens.

6. **Key rotation is versioned, not big-bang.** Each encrypted value is tagged
   with a key id (`keyVersion`, derived from the key itself); decryption selects
   the key by id (`CALENDAR_TOKEN_ENC_KEY` or `CALENDAR_TOKEN_ENC_KEY_PREVIOUS`), and records are
   **re-encrypted lazily on the next token refresh** (or by an optional backfill
   sweep). This lets a compromised key be retired without a synchronous re-encrypt
   of every row. Rotation mechanics and key provisioning are documented in
   `SECURITY.md` before launch (closes RFC-0012 gap G7).

7. **Revoke on disconnect and on account deletion.** Disconnecting calls the
   provider's token `revoke`; user deletion revokes before the cascade. Once
   push channels exist (Tier C), disconnect also tears them down and a cron
   reconciliation sweep stops any provider-side channel whose row no longer
   exists, so a failed `unwatch` can't leave a live subscription reading a
   former user's calendar (RFC-0012 gap G9). No orphaned live tokens or channels.

8. **Config-gated, off by default.** Absent calendar env config, the feature is
   disabled — self-hosters and local dev run without it, exactly like Resend
   email today. The hosted deployment opts in.

## Consequences

- **Easier:** login and calendar lifecycles evolve independently; a passkey user
  can still sync a calendar; a leaked login row grants no calendar access, and a
  leaked calendar row (encrypted) is not directly usable.
- **Harder / committed to:** we now **own** calendar token refresh, encryption,
  and revocation rather than delegating to Better Auth — more code and a real
  key-management responsibility (`CALENDAR_TOKEN_ENC_KEY` provisioning and
  rotation must be documented in `SECURITY.md` and env docs).
- **Read-vs-store asymmetry on Microsoft (privacy nuance):** because Microsoft's
  per-calendar availability read (`calendarView`) returns full event data, the
  busy-only guarantee (decision 4) is enforced at **ingestion** (discard all but
  start/end), not at the wire. The ingestion filter is therefore
  security-relevant: it must be covered by a test and must never log or persist
  the discarded fields. Google's `freebusy.query` has no such exposure.
- **New provider surface:** Microsoft OAuth (Entra app registration) enters the
  product as a connection provider. Its use is bounded to calendar scope; login
  is explicitly out of scope here.
- **Google verification dependency:** `calendar.events` is a Google **sensitive
  scope**; public hosted use requires Google OAuth verification / brand review.
  This ADR accepts that the feature ships behind a flag and that hosted launch is
  gated on that external review; self-hosters bring their own client credentials.
- **Self-hosters own their encryption key.** A self-host deployment must generate
  its own `CALENDAR_TOKEN_ENC_KEY`. Losing or rotating it out without the
  versioned path invalidates every stored connection — users simply re-consent
  (calendar grants are re-obtainable), but the operational note must say so
  plainly so no one treats stored tokens as durable state.
- **Follow-ups this creates:**
  - Env documentation for the new provider secrets (`GOOGLE_CALENDAR_*`,
    `CALENDAR_SYNC_ENABLED`; Microsoft and Tier C variables arrive with their
    RFC). The
    `CALENDAR_TOKEN_ENC_KEY` generation/rotation/loss-recovery model is already
    documented in [SECURITY.md](../SECURITY.md) (§ Calendar token encryption).
  - A future ADR if/when Microsoft (or any provider) becomes a **login** option.
  - Snyk scan of the new calendar dependencies before merge (per the repo's
    security instructions and [ADR-0010](ADR-0010-supply-chain-hardening.md)).
- **Reversibility:** the boundary decision is cheap to hold and additive. Once
  live connections exist, turning the feature off requires a teardown (revoke +
  unwatch), so the connection lifecycle must be correct from day one — but the
  *decision* here (decoupled + encrypted + connection-only Microsoft) constrains
  nothing that a later login-provider ADR couldn't extend.

## Links

- Source RFC: [RFC-0012](../product/rfc/RFC-0012-calendar-integration.md)
- Extends (does not supersede): [ADR-0002](ADR-0002-passwordless-auth.md)
- Related: [ADR-0004](ADR-0004-timezone-handling.md) (UTC instant wire format
  reused for calendar events), [ADR-0010](ADR-0010-supply-chain-hardening.md)
  (dependency scanning), [SECURITY.md](../SECURITY.md)
- Research: [product/research/calendar-integration-benchmark.md](../product/research/calendar-integration-benchmark.md)
- Tracking issue: [#142](https://github.com/grasshopper-protocol/grsshppr/issues/142)
- Accepted in: #144 (docs only)
- Implementation PRs: none yet — Phase 0 not started (see #142)
