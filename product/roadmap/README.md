# Roadmap

Grasshopper's roadmap is public and lives in three horizons. Each item links to
an issue or RFC and states *why now*.

- **[now.md](now.md)** — committed, in flight
- **[next.md](next.md)** — agreed direction, not yet started
- **[later.md](later.md)** — wanted, not yet scheduled

## How it works

- Anything in **Now** has an open issue and an owner.
- Anything that's a major change (new feature/module, schema change, dependency,
  public API, design-system, governance) needs an [RFC](../rfc) before it moves
  from Next → Now.
- Community proposals are welcome — open an issue, a `feature` request, or a
  [Discussion](https://github.com/grasshopper-protocol/grsshppr/discussions).

## Triage & promotion

Proposals don't fall into a void. They move through the horizons in the open:

1. **Intake.** A new idea (issue / `feature` request / Discussion) lands in
   **Later** by default — captured, not yet committed.
2. **Triage.** Maintainers sweep open proposals weekly. Each is either parked in
   **Later**, promoted to **Next** (agreed direction), or declined with a reason
   written on the thread. Triage happens in public, never by DM.
3. **Promotion to Now.** An item moves **Next → Now** when it has an owner and an
   open issue — and, if it's a major change, an accepted [RFC](../rfc) and
   recorded [ADR](../../decisions).
4. **Done.** Shipped items leave **Now** for the [changelog](../../CHANGELOG.md)
   and the decision log — not back into the roadmap.

Promotion across horizons is a product decision; for major changes it follows the
[governance](../../governance/GOVERNANCE.md) decision rights.

This file is the source of truth for direction. It replaces direction that
previously lived only in `AGENTS.md` and agent memory.
