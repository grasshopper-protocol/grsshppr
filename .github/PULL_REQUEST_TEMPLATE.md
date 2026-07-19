## What & why

What changed and why. Link the issue / RFC / ADR this traces to.

- Closes #
- RFC:
- ADR:

## Type

- [ ] Trivial (bug fix, copy, in-place refactor) — no RFC needed
- [ ] Major (new feature/module, schema, dependency, public API, design system,
      governance) — **requires an approved RFC + ADR**

## Checklist

- [ ] Traces to an issue or RFC (no silent changes)
- [ ] Docs updated in this PR (README / ENGINEERING / DESIGN / roadmap / ADR)
- [ ] No undocumented features, no scope smuggling
- [ ] No new dependency without an RFC (or justification below)
- [ ] Schema changes ship as generated migrations (not `db:push`) — see
      [ADR-0003](../decisions/ADR-0003-schema-migrations.md)
- [ ] `pnpm build` passes clean
- [ ] Non-trivial logic has a runnable check
