# Post-mortem: Next 16.3 Turbopack build broke every Vercel deploy

- **Date:** 2026-08-24
- **Severity:** Medium — all new deploys blocked; live site unaffected (last good production deploy kept serving)
- **Status:** Resolved
- **Resulting decision:** [ADR-0012 — Change-safety guardrails](../decisions/ADR-0012-change-safety-guardrails.md) (extended: `build` is now a required check)

## What happened

A grouped Dependabot bump ([#114](https://github.com/grasshopper-protocol/grsshppr/pull/114))
raised `next` from 16.2.10 to **16.3.0**. CI was green and it merged to `main`.
Every Vercel deployment from that commit onward failed at the file-tracing step:

```
Error: ENOENT: no such file or directory, open '/vercel/path0/.next/next-server.js.nft.json'
Command "pnpm run build" exited with 1
```

The build compiled, typechecked, and generated all 25 static pages — then died in
Vercel's `onBuildComplete` step.

## Impact

- Production and preview deploys blocked for ~1 day (from the #114 merge until the fix).
- No live outage: the previous successful production deploy continued to serve.
- No data loss.

## Root cause

Two faults compounded:

1. **Turbopack became the default `build` engine in Next 16.3.** Turbopack does
   not emit the `next-server.js.nft.json` Node file-trace manifest that Vercel's
   builder requires, so the deploy failed at finalize. Bumping to 16.3.2 (latest,
   with Turbopack tracing backports) did **not** fix it — verified on a preview —
   and upstream Turbopack file-tracing is still open (vercel/next.js#87737, #84960).
2. **CI never ran a real build.** The `quality` gate ran only `tsc`, lint, and
   unit tests. `next build` was deliberately omitted (it needs a DB for static
   generation), so a build-breaking dependency change passed CI and reached `main`
   green on GitHub but red on Vercel.

## The fix

- **Restore a working build:** stay on `next` 16.3.2 (keeping the rest of #114's
  bumps) but force the supported webpack engine via `next build --webpack`, which
  emits the file-trace Vercel needs. Verified: preview built Ready. Drop `--webpack`
  once Turbopack tracing is Vercel-ready. ([#117](https://github.com/grasshopper-protocol/grsshppr/pull/117))
- **Close the detection gap:** add a real `build` CI job (ephemeral Postgres +
  migrations + `pnpm build`) so build/deploy-time regressions fail a PR check.
  Fork-friendly, no secrets. Promoted to a **required** status check on `main`.

## Lesson

Codified by extending [ADR-0012](../decisions/ADR-0012-change-safety-guardrails.md):

1. **`tsc` is not a build.** A green typecheck does not prove the app builds or
   deploys. CI must run a real production build; it is now a required gate.
2. **Treat a bundler default-switch as a breaking change.** Even a minor/patch
   dependency bump can flip the build engine (Turbopack) — pin the engine
   explicitly until the new default is proven on the target platform (Vercel).
3. **Grouped Dependabot bumps hide blast radius.** A framework major-behavior
   change can ride inside a "minor-and-patch" group; the required build gate now
   catches this class regardless of how it arrives.
