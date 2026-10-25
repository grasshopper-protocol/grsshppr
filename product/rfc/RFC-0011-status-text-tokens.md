# RFC-0011: Status text tokens (`-text`)

- **Status:** Accepted
- **Author:** @natos (with Claude Code)
- **Created:** 2026-10-19
- **Discipline:** Design
- **Tracking issue:** [#43](https://github.com/grasshopper-protocol/grsshppr/issues/43)

## Summary

Add a fourth token to each status triple from
[ADR-0006](../../decisions/ADR-0006-status-token-layer.md): `success-text`,
`warning-text`, `info-text`, `destructive-text`. Each is the colour for text
and icons on the matching `-subtle` tint, and passes WCAG AA in both themes.
`-foreground` keeps its meaning: text on the **solid** base.

## Motivation

ADR-0006 gave every status a base, a `-subtle` tint and a `-foreground`, but no
token for text *on the tint* — the most common status pattern (badges, callouts,
inline status). With no right answer, consumers guess:

- #120 (fixing #43) used `bg-*-subtle text-*-foreground`. `-foreground` is built
  for the solid base, so goal badges rendered white-on-near-white in light mode
  and near-black-on-dark in dark mode: `active` and `completed` were unreadable.
- The obvious alternative, `text-{status}` (the base), fails AA in three of the
  eight theme × status cases:

| pairing (base on subtle) | light | dark |
|---|---|---|
| success | 4.80 ✓ | **4.32 ✗** |
| warning | **3.07 ✗** | 10.39 ✓ |
| info | 4.75 ✓ | 5.78 ✓ |
| destructive | 6.60 ✓ | **3.93 ✗** |

So there is no existing token a contributor can safely pick. Why now: the bug is
live on `main`, and the next status consumers (#46 badge variants, #47 alert,
the remaining raw colours in sessions/booking) would all hit the same gap.

## Proposal

New semantic tokens, mode-aware, exposed via `@theme inline` as
`text-{status}-text`:

| token | light | dark | contrast on `-subtle` (L / D) |
|---|---|---|---|
| `success-text` | `grass/700` `#3C7209` | `grass/200` `#A4C77F` | 4.80 / 5.66 |
| `warning-text` | `utility/warning-text` `#92400E` (new) | `utility/warning-dark` `#FCD34D` | 6.84 / 10.39 |
| `info-text` | `utility/info` `#2563EB` | `utility/info-dark` `#60A5FA` | 4.75 / 5.78 |
| `destructive-text` | `utility/error-text` `#B91C1C` (new) | `utility/error-text-dark` `#FCA5A5` (new) | 5.91 / 8.51 |

Three new primitives join DESIGN.md §1c. Where the base already passes, `-text`
aliases it, so the visual change is limited to the failing cases.

**Pairing rule** (documented in DESIGN.md §3a and the pattern inventory):
`bg-{s} text-{s}-foreground` for solid; `bg-{s}-subtle text-{s}-text` for tint.

First consumer: the goal-status badges in `src/modules/goals/goals-list.tsx`.

## Alternatives considered

1. **Solid warning badge** (`bg-warning text-warning-foreground`). No new
   token, but "paused" would shout next to two quiet tints, and it fixes only
   warning, leaving dark success/destructive below AA. Rejected.
2. **Darken the base tokens** (e.g. `--warning` → amber-800). Changes every
   solid fill and chart series that uses the base; the base is a fill colour,
   not a text colour. Rejected.
3. **Warning-only `--warning-text`.** Smallest diff, but gives consumers a
   mixed API (`text-info` vs `text-warning-text`), which is exactly the kind of
   guess that caused #120. Rejected in favour of one consistent rule.
4. **Do nothing; document "use the base on subtle".** Ships three AA failures.
   Rejected.

## Risks & trade-offs

- Four more tokens to maintain per theme (eight values). Mitigated by aliasing
  the base where it passes.
- `-text` vs `-foreground` is a naming distinction contributors must learn; the
  pairing rule sits next to the token table to make it hard to miss.
- Reversible: additive, single CSS file plus docs.

## Open questions

- Should the pairing rule be enforced automatically (a contrast check over
  `globals.css` in CI)? Proposed as a follow-up, not in this change.

## Outcome

Accepted by @natos (design) on 2026-10-19 — option 2 of the trade-off above.
Recorded as [ADR-0013](../../decisions/ADR-0013-status-text-tokens.md).
Implemented in #134.
