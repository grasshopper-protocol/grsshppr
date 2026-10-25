# ADR-0016: Account deletion keeps partners' history under a "Deleted user" placeholder

- **Status:** Accepted
- **Date:** 2026-10-25
- **Discipline:** Product
- **Source RFC:** none — direct (bug fix for #149, no schema change)

## Context

`deleteProfile()` deleted every session the departing user took part in. That
erased the **other** participant's history too — their sessions, shared notes,
the feedback they gave and the goals linked to those sessions — and lowered a
mentor's public "sessions completed" count. The person who stayed lost data
because someone else left.

It also failed outright for a mentor credited on a mentee's goal:
`goals.mentor_id` references `users.id` with no `ON DELETE` rule, so the final
`DELETE FROM users` hit a foreign-key violation and the account could not be
deleted at all.

## Options

**A. Delete shared sessions for both (status quo).** Simple; punishes the
partner and loses their records. Rejected.

**B. Make `sessions.mentor_id` / `mentee_id` nullable with `ON DELETE SET
NULL`.** Clean model, but a schema change (RFC + migration) and every reader of
sessions must handle a missing participant. Rejected as more surface than the
problem needs.

**C. Reassign the departed side to a single "Deleted user" placeholder row
(chosen).** GitHub's "ghost" user pattern. No schema change; every reader that
joins sessions to users keeps working and simply shows "Deleted user" with no
picture. The placeholder has no profile, accounts or passkeys, and its email
uses the reserved `.invalid` domain, so no one can sign in as it.

## Decision

Adopt **C**. When a user deletes their account, in one transaction:

1. **Upcoming** (requested or confirmed, not yet started) shared sessions are
   cancelled with reason "Account deleted"; after commit, each partner gets an
   in-app notification and any pending confirm action is resolved.
2. **All** shared sessions are reassigned to the `deleted-user` placeholder and
   kept for the partner, **including shared notes** (one co-edited document per
   session; authorship can't be split, and the partner relies on it).
3. The departing user's **goals** are deleted; their **mentor credit** on other
   people's goals is cleared (`mentor_id = null`).
4. Their **feedback**, profile, availability, notifications, sign-in records,
   passkeys and user row are deleted.

Feedback the partner gave about a kept session stays with the partner.

## Consequences

- **Easier:** the person who stays keeps their history; mentors keep accurate
  "sessions completed" counts; mentor accounts credited on goals can now be
  deleted.
- **Committed to:** the `deleted-user` row must never be given a profile,
  linked account or credentials, and must be excluded wherever a list implies a
  current relationship (done for "Your mentors" on the dashboard).
- **Privacy trade-off:** shared notes may contain the departed person's words.
  We keep them for the partner and say so plainly in the Privacy Policy and the
  account-deletion copy. Revisit if anyone asks for their note contributions to
  be erased.
- Rules live in `src/lib/account-deletion.ts` and are unit-tested.

## Links

- Issue: #149
- Implementation PR: #153
- Related: [ADR-0015](ADR-0015-private-mentee-goals.md) (mentee goals are the mentee's data)
- Privacy Policy: `/privacy-policy` § How long we keep it
- Followed by: ADR-0017 (feedback prompts are deleted on account deletion; proposed)
