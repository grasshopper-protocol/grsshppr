# Now

Committed and in flight. Each item has an owner and an open issue.

## Correctness & openness foundations
- **Rotate leaked Neon credential** — live security item flagged in ops notes.
  _Why now:_ a credential was exposed; this is non-negotiable.
- **Resolve analytics-vs-policy contradiction** — `@vercel/analytics` +
  `@vercel/speed-insights` contradict the no-telemetry policy. Remove them or
  update the policy. _Why now:_ stated values must match the code.
- **Adopt generated migrations** — replace prod `db:push` with
  `db:generate` + `db:migrate`. See [ADR-0003](../../decisions/ADR-0003-schema-migrations.md).
  _Why now:_ schema drift already caused two production incidents.
- **Publish governance + open product scaffolding** — this repo restructure.
  _Why now:_ "open product" requires public roadmap, RFCs, ADRs, and decision
  rights before outside contribution is possible.

> Update this list as items ship. Move completed items into release notes /
> the decision log, not here.
