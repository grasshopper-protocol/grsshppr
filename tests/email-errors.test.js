/**
 * Tests for src/lib/email-errors.ts
 *
 * Only failures where the email certainly wasn't sent may be retried; anything
 * else risks a duplicate email or a daily retry loop.
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyEmailFailure } from "../src/lib/email-errors.js";

describe("classifyEmailFailure", () => {
  it("retries rate limits and provider errors — the email definitely wasn't sent", () => {
    for (const code of [429, 500, 503]) {
      assert.equal(classifyEmailFailure(code), "transient", String(code));
    }
  });

  it("treats other 4xx as final", () => {
    for (const code of [400, 401, 403, 409, 422]) {
      assert.equal(classifyEmailFailure(code), "permanent", String(code));
    }
  });

  it("treats a missing status (network error) as final, to avoid duplicates", () => {
    assert.equal(classifyEmailFailure(null), "permanent");
  });
});
