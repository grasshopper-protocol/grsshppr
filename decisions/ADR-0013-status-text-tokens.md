# ADR-0013: Status text tokens (`-text`)

- **Status:** Accepted
- **Date:** 2026-10-19
- **Discipline:** Design
- **Source RFC:** [RFC-0011](../product/rfc/RFC-0011-status-text-tokens.md)

## Context

[ADR-0006](ADR-0006-status-token-layer.md) defined each status as base +
`-subtle` + `-foreground`. `-foreground` is text on the solid base; there was no
token for text on the `-subtle` tint. #120 paired `-subtle` with `-foreground`
and shipped unreadable goal badges. Using the base on the tint instead fails
WCAG AA for light warning (3.07:1), dark success (4.32:1) and dark destructive
(3.93:1).

## Options

1. Solid warning badge — no token, but inconsistent and fixes warning only.
2. Add a `-text` token to every status, AA-checked per theme. **Chosen.**
3. Darken the base tokens — changes every solid fill; the base is a fill colour.
4. Warning-only `--warning-text` — mixed API that invites the same misuse.

## Decision

Add `success-text`, `warning-text`, `info-text` and `destructive-text`,
mode-aware, in `globals.css`, exposed as `text-{status}-text`. Values (light /
dark): success `#3C7209` / `#A4C77F`; warning `#92400E` / `#FCD34D`; info
`#2563EB` / `#60A5FA`; destructive `#B91C1C` / `#FCA5A5`. All pass ≥ 4.5:1 on
their `-subtle` in both themes. New primitives `utility/warning-text`,
`utility/error-text` and `utility/error-text-dark` join DESIGN.md §1c.

The pairing rule is: solid → `bg-{s} text-{s}-foreground`; tint →
`bg-{s}-subtle text-{s}-text`.

This **extends** ADR-0006 (no existing token changes value or meaning), so
ADR-0006 stays Accepted.

## Consequences

- Status tints are buildable without guessing; the goal badges are fixed.
- #46 (badge status variants) and #47 (alert) should consume `-text` on tints.
- Remaining raw status colours (sessions page, booking rows, mentor page) can
  migrate onto `-subtle` + `-text`.
- Follow-up worth considering: an automated contrast check over the token pairs
  so the rule is enforced, not only documented.

## Links

- RFC: [RFC-0011](../product/rfc/RFC-0011-status-text-tokens.md)
- Extends: [ADR-0006](ADR-0006-status-token-layer.md)
- Tokens: [DESIGN.md](../DESIGN.md) §1c, §3a
- Fixes the regression from #120 (issue #43)
- Implementation PR: #134
