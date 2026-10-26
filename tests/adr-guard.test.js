/**
 * Tests for src/lib/adr-guard.ts
 *
 * ADRs merge as Accepted with the change they describe (ADR-0019). Twice an
 * ADR merged still Proposed (#166, #178); this guard makes CI catch it, and
 * keeps the decisions index in step with the files.
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { adrStatus, checkAdrs, indexStatuses } from "../src/lib/adr-guard.js";

const adr = (status) => `# ADR-0042: Something\n\n- **Status:** ${status}\n- **Date:** 2026-10-26\n`;
const readme = (status) => `| ADR | Title | Status |\n|-----|-------|--------|\n| [0042](ADR-0042-something.md) | Something | ${status} |\n`;
const file = (status) => [{ path: "decisions/ADR-0042-something.md", content: adr(status) }];
const changed = new Set(["decisions/ADR-0042-something.md"]);

describe("adrStatus", () => {
  it("reads the status word, ignoring trailing notes", () => {
    assert.equal(adrStatus(adr("Accepted")), "Accepted");
    assert.equal(adrStatus(adr("Proposed (becomes Accepted when its implementation PR merges)")), "Proposed");
    assert.equal(adrStatus(adr("Superseded by ADR-0050")), "Superseded by ADR-0050");
    assert.equal(adrStatus("# no status here"), null);
  });
});

describe("indexStatuses", () => {
  it("reads number → status from the index table", () => {
    assert.deepEqual([...indexStatuses(readme("Accepted"))], [["0042", "Accepted"]]);
  });
});

describe("checkAdrs", () => {
  it("passes an Accepted ADR that matches the index", () => {
    assert.deepEqual(checkAdrs(file("Accepted"), readme("Accepted"), changed), []);
  });

  it("fails an ADR changed in the PR that is still Proposed", () => {
    const problems = checkAdrs(file("Proposed (becomes Accepted…)"), readme("Proposed"), changed);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /still Proposed/);
  });

  it("allows a Proposed ADR the PR didn't touch (e.g. on main)", () => {
    assert.deepEqual(checkAdrs(file("Proposed"), readme("Proposed"), new Set()), []);
  });

  it("fails when the index disagrees with the file", () => {
    assert.match(checkAdrs(file("Accepted"), readme("Proposed"), new Set())[0], /index says "Proposed"/);
  });

  it("fails when an ADR is missing from the index", () => {
    assert.match(checkAdrs(file("Accepted"), "", new Set())[0], /missing from the index/);
  });

  it("fails an ADR with no status line", () => {
    assert.match(checkAdrs([{ path: "decisions/ADR-0042-x.md", content: "# x" }], readme("Accepted"), new Set())[0], /no "- \*\*Status:\*\*"/);
  });

  it("accepts a superseded ADR listed as superseded", () => {
    assert.deepEqual(checkAdrs(file("Superseded by ADR-0050"), readme("Superseded by ADR-0050"), changed), []);
  });

  it("passes on the repository's own decisions record", () => {
    const files = readdirSync("decisions")
      .filter((f) => /^ADR-\d{4}-.+\.md$/.test(f))
      .map((f) => ({ path: `decisions/${f}`, content: readFileSync(`decisions/${f}`, "utf8") }));
    assert.deepEqual(checkAdrs(files, readFileSync("decisions/README.md", "utf8"), new Set()), []);
  });
});
