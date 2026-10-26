/**
 * Tests for src/lib/calendar/token-crypto.ts
 *
 * Calendar refresh tokens carry write access to people's calendars (ADR-0014).
 * A DB dump alone must not yield them, tampering must be detected, and keys
 * must rotate without re-encrypting every row at once.
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  decryptToken,
  encryptToken,
  envelopeKeyId,
  keyId,
  needsReencryption,
  parseKey,
} from "../src/lib/calendar/token-crypto.js";

const k1 = randomBytes(32);
const k2 = randomBytes(32);
const SECRET = "1//refresh-token-value";

describe("parseKey", () => {
  it("accepts a 32-byte base64 key", () => {
    assert.equal(parseKey(k1.toString("base64")).length, 32);
  });

  it("rejects missing, short and long keys", () => {
    for (const bad of [undefined, "", randomBytes(16).toString("base64"), randomBytes(33).toString("base64")]) {
      assert.throws(() => parseKey(bad), /32 bytes/);
    }
  });
});

describe("encryptToken / decryptToken", () => {
  it("round-trips", () => {
    const env = encryptToken(SECRET, k1, "conn-1", "refresh");
    assert.equal(decryptToken(env, { current: k1 }, "conn-1", "refresh"), SECRET);
  });

  it("never contains the plaintext and differs every time (random nonce)", () => {
    const a = encryptToken(SECRET, k1, "conn-1", "refresh");
    const b = encryptToken(SECRET, k1, "conn-1", "refresh");
    assert.notEqual(a, b);
    assert.ok(!a.includes(SECRET) && !Buffer.from(a).toString().includes("refresh-token"));
    assert.equal(envelopeKeyId(a), keyId(k1));
  });

  it("detects tampering with any part", () => {
    const env = encryptToken(SECRET, k1, "conn-1", "refresh");
    const parts = env.split(".");
    for (let i = 1; i < 4; i++) {
      const p = [...parts];
      const buf = Buffer.from(p[i], "base64url");
      buf[0] ^= 1;
      p[i] = buf.toString("base64url");
      assert.throws(() => decryptToken(p.join("."), { current: k1 }, "conn-1", "refresh"), undefined, `part ${i}`);
    }
  });

  it("can't be moved to another connection or column (AAD)", () => {
    const env = encryptToken(SECRET, k1, "conn-1", "refresh");
    assert.throws(() => decryptToken(env, { current: k1 }, "conn-2", "refresh"));
    assert.throws(() => decryptToken(env, { current: k1 }, "conn-1", "access"));
  });

  it("rejects unknown keys and malformed envelopes", () => {
    const env = encryptToken(SECRET, k1, "c", "refresh");
    assert.throws(() => decryptToken(env, { current: k2 }, "c", "refresh"), /unknown key/);
    assert.throws(() => decryptToken("a.b.c", { current: k1 }, "c", "refresh"), /Malformed/);
  });
});

describe("key rotation", () => {
  it("decrypts with the previous key and flags the envelope for re-encryption", () => {
    const old = encryptToken(SECRET, k1, "c", "refresh");
    const keys = { current: k2, previous: k1 };
    assert.equal(decryptToken(old, keys, "c", "refresh"), SECRET);
    assert.equal(needsReencryption(old, keys), true);
    const fresh = encryptToken(SECRET, keys.current, "c", "refresh");
    assert.equal(needsReencryption(fresh, keys), false);
  });
});
