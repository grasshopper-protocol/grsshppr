/**
 * Tests for src/lib/calendar/oauth.ts
 *
 * The calendar connect flow grants write access to someone's calendar
 * (ADR-0014). Its state cookie must bind the callback to the same user and
 * attempt, expire, and resist forgery; PKCE must be S256.
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash, createHmac, hkdfSync } from "node:crypto";
import {
  CALENDAR_SCOPE,
  STATE_TTL_MS,
  authorizeUrl,
  hasCalendarScope,
  idTokenClaims,
  pkceChallenge,
  randomToken,
  signState,
  verifyState,
} from "../src/lib/calendar/oauth.js";

const SECRET = "app-secret-for-tests-0123456789abcdef";
const NOW = 1_800_000_000_000;
const payload = { state: "st4te", verifier: "v3rifier", userId: "u1", exp: NOW + STATE_TTL_MS };
const ok = { appSecret: SECRET, state: "st4te", userId: "u1", now: NOW };

describe("PKCE and the authorise URL", () => {
  it("uses an S256 challenge of the verifier", () => {
    const v = randomToken();
    assert.match(v, /^[A-Za-z0-9_-]{43}$/);
    assert.equal(pkceChallenge(v), createHash("sha256").update(v).digest("base64url"));
  });

  it("asks for offline access, consent, PKCE and only the narrow calendar scope", () => {
    const url = new URL(authorizeUrl({ clientId: "cid", redirectUri: "https://x.test/cb", state: "s", codeChallenge: "c" }));
    const q = url.searchParams;
    assert.equal(url.origin + url.pathname, "https://accounts.google.com/o/oauth2/v2/auth");
    assert.equal(q.get("access_type"), "offline");
    assert.equal(q.get("prompt"), "consent");
    assert.equal(q.get("code_challenge_method"), "S256");
    assert.deepEqual(q.get("scope").split(" "), ["openid", "email", CALENDAR_SCOPE]);
    assert.ok(!q.get("scope").includes("calendar.events "), "not the broader calendar.events");
  });

  it("checks the calendar scope was actually granted", () => {
    assert.equal(hasCalendarScope(`openid email ${CALENDAR_SCOPE}`), true);
    assert.equal(hasCalendarScope("openid email"), false);
    assert.equal(hasCalendarScope(undefined), false);
  });
});

describe("state cookie", () => {
  it("returns the PKCE verifier for the same user, state and time window", () => {
    assert.equal(verifyState(signState(payload, SECRET), ok), "v3rifier");
  });

  it("rejects another user, another state, an expired cookie and a missing state", () => {
    const c = signState(payload, SECRET);
    assert.equal(verifyState(c, { ...ok, userId: "u2" }), null);
    assert.equal(verifyState(c, { ...ok, state: "other" }), null);
    assert.equal(verifyState(c, { ...ok, now: NOW + STATE_TTL_MS + 1 }), null);
    assert.equal(verifyState(c, { ...ok, state: null }), null);
  });

  it("rejects forgeries and malformed cookies", () => {
    const c = signState(payload, SECRET);
    const [body] = c.split(".");
    const forgedBody = Buffer.from(JSON.stringify({ ...payload, userId: "attacker" })).toString("base64url");
    assert.equal(verifyState(`${forgedBody}.${c.split(".")[1]}`, { ...ok, userId: "attacker" }), null);
    assert.equal(verifyState(signState(payload, "another-app-secret-0123456789abcdef"), ok), null);
    assert.equal(verifyState(`${body}.x`, ok), null);
    assert.equal(verifyState("garbage", ok), null);
    assert.equal(verifyState(undefined, ok), null);
    const notJson = Buffer.from("{not json").toString("base64url");
    assert.equal(verifyState(`${notJson}.${signStateRaw(notJson)}`, ok), null);
  });

  it("refuses to sign or accept with a missing or placeholder app secret", () => {
    assert.throws(() => signState(payload, undefined));
    assert.throws(() => signState(payload, ""));
    assert.throws(() => signState(payload, "short-secret"));
    const c = signState(payload, SECRET);
    assert.equal(verifyState(c, { ...ok, appSecret: undefined }), null);
    assert.equal(verifyState(c, { ...ok, appSecret: "" }), null);
  });
});

// Sign an arbitrary body with the real key derivation, to reach the JSON-parse branch.
function signStateRaw(body) {
  const key = Buffer.from(hkdfSync("sha256", SECRET, "", "grsshppr calendar oauth state v1", 32));
  return createHmac("sha256", key).update(body).digest("base64url");
}

describe("idTokenClaims", () => {
  const token = (claims) => `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.sig`;

  it("reads sub and email for our client", () => {
    assert.deepEqual(idTokenClaims(token({ sub: "123", email: "a@b.test", aud: "cid" }), "cid"), { sub: "123", email: "a@b.test" });
    assert.deepEqual(idTokenClaims(token({ sub: "123", aud: ["other", "cid"] }), "cid"), { sub: "123", email: null });
  });

  it("rejects tokens for another client, without a subject, or malformed", () => {
    assert.equal(idTokenClaims(token({ sub: "123", aud: "someone-else" }), "cid"), null);
    assert.equal(idTokenClaims(token({ aud: "cid" }), "cid"), null);
    assert.equal(idTokenClaims("not-a-jwt", "cid"), null);
    assert.equal(idTokenClaims(`h.${Buffer.from("{bad").toString("base64url")}.s`, "cid"), null);
    assert.equal(idTokenClaims(undefined, "cid"), null);
  });
});
