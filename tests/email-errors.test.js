/**
 * Tests for src/lib/email-errors.ts
 *
 * Only transient failures may be retried; retrying a permanent one (an invalid
 * or suppressed address, missing config) just repeats the failure every day.
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classifyEmailFailure } from "../src/lib/email-errors.js";

describe("classifyEmailFailure", () => {
  it("treats network errors, rate limits, conflicts and 5xx as transient", () => {
    for (const code of [null, 409, 429, 500, 503]) {
      assert.equal(classifyEmailFailure(code), "transient", String(code));
    }
  });

  it("treats other 4xx as permanent", () => {
    for (const code of [400, 401, 403, 422]) {
      assert.equal(classifyEmailFailure(code), "permanent", String(code));
    }
  });
});
