/**
 * Tests for src/lib/safe-redirect.ts
 *
 * The sign-in page honours ?callbackUrl= (#161). It must only ever redirect
 * within this site — a crafted link must not bounce users to another domain.
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeCallbackPath } from "../src/lib/safe-redirect.js";

describe("safeCallbackPath", () => {
  it("keeps same-site paths, including query strings", () => {
    assert.equal(safeCallbackPath("/session/11111111-1111-4111-8111-111111111111"), "/session/11111111-1111-4111-8111-111111111111");
    assert.equal(safeCallbackPath("/settings?tab=calendar"), "/settings?tab=calendar");
  });

  it("falls back when there's nothing to go back to", () => {
    assert.equal(safeCallbackPath(null), "/dashboard");
    assert.equal(safeCallbackPath(""), "/dashboard");
    assert.equal(safeCallbackPath(undefined, "/welcome"), "/welcome");
  });

  it("rejects other sites", () => {
    for (const bad of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "\\\\evil.example",
      "javascript:alert(1)",
      "/javascript:alert(1)",
      " /dashboard",
      "/dash\nboard",
      "/dash\tboard",
      "evil.example/path",
    ]) {
      assert.equal(safeCallbackPath(bad), "/dashboard", JSON.stringify(bad));
    }
  });

  it("refuses to loop back into the auth pages", () => {
    assert.equal(safeCallbackPath("/sign-in"), "/dashboard");
    assert.equal(safeCallbackPath("/sign-up?x=1"), "/dashboard");
    assert.equal(safeCallbackPath("/sign-inside"), "/sign-inside");
  });

  it("rejects absurdly long values", () => {
    assert.equal(safeCallbackPath("/" + "a".repeat(600)), "/dashboard");
  });
});
