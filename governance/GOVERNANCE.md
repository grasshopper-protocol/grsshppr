# Governance

How decisions get made in Grasshopper, who makes them, and what happens when
people disagree. This is deliberately lightweight — process for *change*, not
bureaucracy for *work*.

## Principles

- **Open by default.** Decisions and their reasoning are public.
- **Three disciplines, equal weight.** Product, Design, and Engineering each
  have decision authority in their domain. None is support staff for another.
- **Traceable.** Every significant decision has an [ADR](../decisions); major
  ones start as an [RFC](../product/rfc).

## Roles

| Role | Who | What they do |
|------|-----|--------------|
| **Maintainer** | See [MAINTAINERS.md](MAINTAINERS.md) | Reviews and merges, records ADRs, owns a discipline (product / design / eng) |
| **Contributor** | Anyone | Opens issues, RFCs, design proposals, PRs |
| **Lead / tiebreaker** | Project founder | Final call when maintainers can't reach consensus |

## Decision rights

- **Trivial changes** (bug fixes, copy, in-place refactors): any maintainer
  reviews + merges. No RFC.
- **Major changes** (new feature/module, schema, dependency, public API,
  design system, governance): require an RFC, then an ADR recorded by the
  maintainer who owns the relevant discipline.
- **Cross-discipline changes**: need sign-off from each affected discipline's
  maintainer.

## How decisions are finalised

1. Proposal raised (issue → RFC for major changes).
2. Discussion in the open (RFC PR thread / GitHub Discussions).
3. **Lazy consensus**: if no maintainer objects within a reasonable window, the
   proposal is accepted.
4. The owning-discipline maintainer records the ADR. Done.

## Conflict resolution

1. Disagreement is worked out on the thread, in the open, with reasoning written
   down (not DM'd away).
2. If maintainers can't agree, the owning-discipline maintainer decides and
   records the dissent in the ADR's Consequences.
3. If it crosses disciplines or stays deadlocked, the lead/tiebreaker makes the
   final call — and writes down why.

No decision is resolved privately. The rationale is always recorded.

## Becoming a maintainer

Sustained, quality contribution across any layer (code, design, product, docs)
plus alignment with the project's principles. Existing maintainers propose and
agree by lazy consensus. Added to [MAINTAINERS.md](MAINTAINERS.md) and
`.github/CODEOWNERS`.
