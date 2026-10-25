/**
 * Tests for src/lib/cron-auth.ts
 *
 * Cron routes mutate data and send email, so an unauthenticated call MUST be
 * rejected — including when CRON_SECRET is missing (fail closed, #138).
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isAuthorizedCronRequest } from "../src/lib/cron-auth.js";

const SECRET = "s3cret-value-for-tests";

describe("isAuthorizedCronRequest", () => {
  it("accepts the exact Bearer secret", () => {
    assert.equal(isAuthorizedCronRequest(`Bearer ${SECRET}`, SECRET), true);
  });

  it("rejects a wrong secret of the same length", () => {
    const wrong = "x".repeat(SECRET.length);
    assert.equal(isAuthorizedCronRequest(`Bearer ${wrong}`, SECRET), false);
  });

  it("rejects a wrong secret of a different length", () => {
    assert.equal(isAuthorizedCronRequest("Bearer short", SECRET), false);
  });

  it("rejects the secret without the Bearer prefix", () => {
    assert.equal(isAuthorizedCronRequest(SECRET, SECRET), false);
  });

  it("rejects a missing header", () => {
    assert.equal(isAuthorizedCronRequest(null, SECRET), false);
  });

  it("fails closed when CRON_SECRET is unset", () => {
    assert.equal(isAuthorizedCronRequest("Bearer anything", undefined), false);
  });

  it("fails closed when CRON_SECRET is empty", () => {
    assert.equal(isAuthorizedCronRequest("Bearer ", ""), false);
  });
});
