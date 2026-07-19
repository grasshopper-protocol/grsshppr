# ADR-0002: Passwordless auth (OAuth + passkeys)

- **Status:** Accepted
- **Date:** 2026-06-19
- **Discipline:** Engineering
- **Source RFC:** none — foundational decision, recorded retroactively

## Context

Auth is a security-critical boundary. Passwords bring resets, credential
stuffing, breach liability, and support load — all undesirable for a small
volunteer-run open project.

## Options

- **Email + password** — familiar, but maximum attack surface and support
  burden (resets, breaches, stuffing).
- **Magic links only** — passwordless, but email-dependent and phishable.
- **OAuth (Google, GitHub) + passkeys** — no shared secrets to leak, strong
  phishing resistance via WebAuthn. Chosen.

## Decision

Passwordless only: OAuth providers (Google, GitHub) plus passkeys via the
Better Auth passkey plugin (`@simplewebauthn`, `rpName: "Grasshopper"`).
No passwords anywhere.

## Consequences

- No password reset flows, no credential-stuffing exposure.
- Adding auth providers beyond these requires explicit approval (an RFC).
- Prod auth relies on the proxy (`src/proxy.ts`) handling both `__Secure-`
  prefixed and unprefixed cookie names.

## Links

- `ENGINEERING.md` → Decision Log / auth notes
- `LOG.md` (2026-06-19 rows)
