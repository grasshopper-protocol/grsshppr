/**
 * Tests for src/lib/email-tokens.ts
 *
 * These tokens authorize one-click confirm/cancel links in booking emails, so a
 * forged or expired token MUST be rejected. The module reads BETTER_AUTH_SECRET
 * at load time, so we set it before importing.
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createRequire } from "node:module";

const SECRET = "test-secret-key-for-email-tokens";
process.env.BETTER_AUTH_SECRET ??= SECRET;

// The module captures BETTER_AUTH_SECRET at load, so it must be required
// (synchronously, after the env var is set) rather than statically imported —
// static ESM imports are hoisted above the assignment above.
const require = createRequire(import.meta.url);
const { signEmailAction, verifyEmailAction } = require("../src/lib/email-tokens.ts");

// Rebuild the wire format the module uses, so we can forge test tokens.
function forge(payload, { secret = process.env.BETTER_AUTH_SECRET } = {}) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

describe("signEmailAction / verifyEmailAction", () => {
  it("round-trips a valid token", () => {
    const token = signEmailAction("session-123", "confirm");
    const payload = verifyEmailAction(token);
    assert.ok(payload, "valid token must verify");
    assert.equal(payload.sessionId, "session-123");
    assert.equal(payload.action, "confirm");
  });

  it("preserves the cancel action", () => {
    const payload = verifyEmailAction(signEmailAction("s1", "cancel"));
    assert.equal(payload.action, "cancel");
  });

  it("sets an expiry roughly 7 days out", () => {
    const payload = verifyEmailAction(signEmailAction("s1", "confirm"));
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const delta = payload.exp - Date.now();
    // Allow a generous window for slow CI; just prove it's ~7 days, not 0 or huge.
    assert.ok(delta > sevenDays - 60_000 && delta <= sevenDays, "exp ~7 days out");
  });

  it("rejects a tampered signature", () => {
    const token = signEmailAction("s1", "confirm");
    const [encoded] = token.split(".");
    assert.equal(verifyEmailAction(`${encoded}.deadbeef`), null);
  });

  it("rejects a tampered payload (signature no longer matches)", () => {
    const token = signEmailAction("s1", "confirm");
    const [, sig] = token.split(".");
    const evil = Buffer.from(
      JSON.stringify({ sessionId: "s1", action: "cancel", exp: Date.now() + 1000 })
    ).toString("base64url");
    assert.equal(verifyEmailAction(`${evil}.${sig}`), null);
  });

  it("rejects a token signed with a different secret", () => {
    const token = forge(
      { sessionId: "s1", action: "confirm", exp: Date.now() + 1000 },
      { secret: "attacker-secret" }
    );
    assert.equal(verifyEmailAction(token), null);
  });

  it("rejects an expired token even with a valid signature", () => {
    const token = forge({ sessionId: "s1", action: "confirm", exp: Date.now() - 1 });
    assert.equal(verifyEmailAction(token), null);
  });

  it("rejects malformed tokens", () => {
    assert.equal(verifyEmailAction(""), null);
    assert.equal(verifyEmailAction("no-dot-here"), null);
    assert.equal(verifyEmailAction("."), null);
    assert.equal(verifyEmailAction("onlyencoded."), null);
  });

  it("rejects a token whose payload is not valid JSON", () => {
    const encoded = Buffer.from("not json").toString("base64url");
    const sig = createHmac("sha256", process.env.BETTER_AUTH_SECRET)
      .update(encoded)
      .digest("base64url");
    assert.equal(verifyEmailAction(`${encoded}.${sig}`), null);
  });

  it("allows multiple independent tokens to coexist", () => {
    const confirm = signEmailAction("session-a", "confirm");
    const cancel = signEmailAction("session-b", "cancel");
    const other = signEmailAction("session-c", "confirm");

    const a = verifyEmailAction(confirm);
    const b = verifyEmailAction(cancel);
    const c = verifyEmailAction(other);

    assert.ok(a && b && c, "all three tokens must verify independently");
    assert.equal(a.sessionId, "session-a");
    assert.equal(a.action, "confirm");
    assert.equal(b.sessionId, "session-b");
    assert.equal(b.action, "cancel");
    assert.equal(c.sessionId, "session-c");
    // Verifying one token must not invalidate the others.
    assert.ok(verifyEmailAction(confirm));
    assert.ok(verifyEmailAction(cancel));
  });

  it("issues different tokens for the same input (exp/time salt)", () => {
    const first = signEmailAction("session-same", "confirm");
    // Busy-wait so Date.now() advances at least 1ms between signs.
    const start = Date.now();
    while (Date.now() === start) {
      /* spin */
    }
    const second = signEmailAction("session-same", "confirm");
    assert.notEqual(
      first,
      second,
      "same sessionId/action must not mint identical wire tokens",
    );
    assert.ok(verifyEmailAction(first));
    assert.ok(verifyEmailAction(second));
  });

  it("rejects a token with missing signature segment", () => {
    const token = signEmailAction("s1", "confirm");
    const [encoded] = token.split(".");
    assert.equal(verifyEmailAction(encoded), null);
    assert.equal(verifyEmailAction(`${encoded}.`), null);
  });
});
