/**
 * Tests for src/lib/api-utils.ts
 *
 * safeJson and rateLimit guard every mutating API route, so their failure modes
 * (bad JSON, over-limit bursts) must behave predictably. rateLimit keeps state
 * in a module-level Map, so each test uses a distinct IP to stay isolated.
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { safeJson, rateLimit, uuidParam } from "../src/lib/api-utils.js";

function reqWithIp(ip) {
  return { headers: new Headers({ "x-forwarded-for": ip }) };
}

describe("safeJson", () => {
  it("parses valid JSON bodies", async () => {
    const req = new Request("http://test/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ hello: "world" }),
    });
    const { data, error } = await safeJson(req);
    assert.equal(error, null);
    assert.deepEqual(data, { hello: "world" });
  });

  it("returns a 400 response for malformed JSON", async () => {
    const req = new Request("http://test/x", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{ not valid",
    });
    const { data, error } = await safeJson(req);
    assert.equal(data, null);
    assert.ok(error, "error response must be present");
    assert.equal(error.status, 400);
  });
});

describe("uuidParam", () => {
  it("accepts a valid UUID", () => {
    const r = uuidParam.safeParse("3f2504e0-4f89-41d3-9a0c-0305e82c3301");
    assert.equal(r.success, true);
  });

  it("rejects a non-UUID string", () => {
    assert.equal(uuidParam.safeParse("not-a-uuid").success, false);
    assert.equal(uuidParam.safeParse("").success, false);
  });
});

describe("rateLimit", () => {
  it("allows requests up to the limit", () => {
    const req = reqWithIp("10.0.0.1");
    for (let i = 0; i < 3; i++) {
      assert.equal(rateLimit(req, { limit: 3, windowMs: 60_000 }), null);
    }
  });

  it("blocks the request that exceeds the limit with a 429", () => {
    const req = reqWithIp("10.0.0.2");
    // First `limit` calls pass, the next one is blocked.
    for (let i = 0; i < 3; i++) rateLimit(req, { limit: 3, windowMs: 60_000 });
    const blocked = rateLimit(req, { limit: 3, windowMs: 60_000 });
    assert.ok(blocked, "over-limit call must return a response");
    assert.equal(blocked.status, 429);
  });

  it("tracks limits per IP independently", () => {
    const a = reqWithIp("10.0.0.3");
    const b = reqWithIp("10.0.0.4");
    for (let i = 0; i < 3; i++) rateLimit(a, { limit: 3, windowMs: 60_000 });
    // b is a fresh IP, so its first call is still under the limit.
    assert.equal(rateLimit(b, { limit: 3, windowMs: 60_000 }), null);
  });

  it("forgets hits older than the window", () => {
    const req = reqWithIp("10.0.0.5");
    // A window of 0ms means every prior hit is already expired on the next call.
    for (let i = 0; i < 5; i++) {
      assert.equal(rateLimit(req, { limit: 1, windowMs: 0 }), null);
    }
  });
});
