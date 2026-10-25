# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in Grasshopper, please report it responsibly.

**Do not open a public issue.**

Instead, use [GitHub's private vulnerability reporting](https://github.com/grasshopper-protocol/grsshppr/security/advisories/new) or email the maintainers directly.

## What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

## Response

We aim to acknowledge reports within 48 hours and provide a fix or mitigation within 7 days for critical issues.

## Scope

This policy applies to the Grasshopper codebase. Third-party dependencies should be reported to their respective maintainers.

## Calendar token encryption & key management

_Applies once calendar integration ([RFC-0012](product/rfc/RFC-0012-calendar-integration.md) /
[ADR-0014](decisions/ADR-0014-calendar-connection-auth-boundary.md)) is enabled. Absent
calendar config, none of this applies._

Calendar connections store long-lived OAuth **refresh tokens with calendar write
scope** — the most sensitive secrets in the system. They are never stored in
plaintext.

- **Cipher.** Tokens are encrypted with **AES-256-GCM** (authenticated
  encryption), a random per-record nonce, and a single application key,
  `CALENDAR_TOKEN_ENC_KEY`. Ciphertext lives in `calendar_connections`; the key is
  never persisted to the database.
- **Generating the key.** 32 bytes, base64-encoded:
  `openssl rand -base64 32`. Set it as `CALENDAR_TOKEN_ENC_KEY` in the deployment
  environment (Vercel project env / self-host `.env`). Treat it like any other
  production secret: never commit it, never log it.
- **Rotation (versioned, lazy).** Each encrypted value carries a key id
  derived from the key that encrypted it, and the connection id is bound as
  additional authenticated data. To rotate, move the current key to
  `CALENDAR_TOKEN_ENC_KEY_PREVIOUS` (decrypt-only) and set a new
  `CALENDAR_TOKEN_ENC_KEY`; records re-encrypt to the new key on their next
  token refresh (or via an optional backfill sweep). Remove the previous key
  once no rows reference its id. This retires a key without a synchronous
  re-encrypt of every row.
- **Key loss = re-consent, not data loss.** If `CALENDAR_TOKEN_ENC_KEY` is lost
  or rotated out without the versioned path, existing stored tokens become
  undecryptable. This is **recoverable**: affected users simply reconnect their
  calendar (grants are re-obtainable). Stored tokens are cache, not durable state
  — operators should not treat them as backups.
- **Compromise response.** If the key (or a DB dump plus key) is suspected
  compromised: revoke provider tokens for affected connections, rotate the key,
  force reconnection, and follow the vulnerability-response timeline above. Treat
  exposure of users' calendar access as a reportable incident.
- **Self-hosters.** You own your key. Provision it before enabling calendar sync,
  store it in your secret manager, and include it in your key-rotation runbook.
