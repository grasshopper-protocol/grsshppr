/**
 * Google Calendar connections against a real Postgres and a fake Google
 * (RFC-0012 §2, §9; ADR-0014): tokens stored encrypted, refresh and key
 * rotation, revoked grants, disconnect, and the backfill on connect.
 */

import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { configureTestDatabase, startFakeGoogle, resetDatabase, seedUsers, sessionRow } from "./helpers.mjs";

configureTestDatabase();
const google = await startFakeGoogle();
const { db, closeDb } = await import("../src/lib/db/index.ts");
const { users, sessions, calendarConnections, calendarOutbox, notifications } = await import("../src/lib/db/schema.ts");
const { sql } = await import("drizzle-orm");
const { envelopeKeyId, keyId } = await import("../src/lib/calendar/token-crypto.ts");
const conn = await import("../src/modules/calendar/connection-queries.ts");
const { GoogleError } = await import("../src/modules/calendar/google-client.ts");

const keyA = randomBytes(32);
const keyB = randomBytes(32);
const config = (current = keyA, previous) => ({ enabled: true, clientId: "cid", clientSecret: "csecret", keys: { current, ...(previous ? { previous } : {}) } });
const tokens = (refresh = "refresh-1") => ({ access_token: "access-0", refresh_token: refresh, expires_in: 3600, scope: "openid email calendar" });
const claims = { sub: "google-sub-1", email: "sam@example.test" };
const row = async () => (await db.select().from(calendarConnections))[0];

after(async () => {
  await closeDb();
  await google.close();
});

describe("calendar connections", () => {
  beforeEach(async () => {
    await resetDatabase(db, sql);
    google.calls.length = 0;
    await seedUsers(db, users, ["e", "m"]);
  });

  it("stores both tokens encrypted, never in plaintext", async () => {
    await conn.saveConnection({ userId: "e", tokens: tokens(), claims, config: config() });
    const c = await row();
    assert.ok(!JSON.stringify(c).includes("refresh-1") && !JSON.stringify(c).includes("access-0"));
    assert.equal(envelopeKeyId(c.refreshTokenEnc), keyId(keyA));
    assert.deepEqual([c.email, c.status, c.providerAccountId], ["sam@example.test", "active", "google-sub-1"]);
  });

  it("reconnecting replaces the connection in place", async () => {
    const first = await conn.saveConnection({ userId: "e", tokens: tokens("refresh-1"), claims, config: config() });
    await db.update(calendarConnections).set({ status: "error", lastError: "auth" });
    const second = await conn.saveConnection({ userId: "e", tokens: tokens("refresh-2"), claims, config: config() });
    assert.equal(first, second);
    const all = await db.select().from(calendarConnections);
    assert.equal(all.length, 1);
    assert.deepEqual([all[0].status, all[0].lastError], ["active", null]);
  });

  it("returns a fresh access token without calling Google", async () => {
    const id = await conn.saveConnection({ userId: "e", tokens: tokens(), claims, config: config() });
    assert.equal(await conn.getAccessToken(id, config()), "access-0");
    assert.equal(google.calls.length, 0);
  });

  it("refreshes an expiring token and stores the new one encrypted", async () => {
    const id = await conn.saveConnection({ userId: "e", tokens: tokens(), claims, config: config() });
    await db.update(calendarConnections).set({ accessTokenExpiresAt: new Date(Date.now() + 10_000) });
    assert.match(await conn.getAccessToken(id, config()), /^access-[1-9]\d*$/);
    assert.equal(google.calls[0].form.grant_type, "refresh_token");
    assert.equal(google.calls[0].form.refresh_token, "refresh-1");
    assert.ok((await row()).accessTokenExpiresAt.getTime() > Date.now() + 3_000_000);
  });

  it("re-encrypts with the current key after a key rotation", async () => {
    const id = await conn.saveConnection({ userId: "e", tokens: tokens(), claims, config: config(keyA) });
    const refreshed = await conn.getAccessToken(id, config(keyB, keyA));
    assert.notEqual(refreshed, "access-0", "an envelope under the old key triggers a refresh");
    const c = await row();
    assert.equal(envelopeKeyId(c.refreshTokenEnc), keyId(keyB));
    assert.equal(envelopeKeyId(c.accessTokenEnc), keyId(keyB));
    assert.equal(await conn.getAccessToken(id, config(keyB)), refreshed, "readable without the old key");
  });

  it("marks the connection as needing reconnection when the grant was revoked", async () => {
    const id = await conn.saveConnection({ userId: "e", tokens: tokens("revoked"), claims, config: config() });
    await db.update(calendarConnections).set({ accessTokenExpiresAt: new Date(0) });
    await assert.rejects(conn.getAccessToken(id, config()), (err) => err instanceof GoogleError && err.failure === "auth");
    const c = await row();
    assert.deepEqual([c.status, c.lastError], ["error", "invalid_grant"]);
    await assert.rejects(conn.getAccessToken(id, config()), (err) => err.failure === "auth", "stays stopped until reconnected");
  });

  it("tokens we can no longer decrypt ask the user to reconnect instead of retrying silently", async () => {
    const id = await conn.saveConnection({ userId: "e", tokens: tokens(), claims, config: config(keyA) });
    await assert.rejects(conn.getAccessToken(id, config(keyB)), (err) => err instanceof GoogleError && err.failure === "auth");
    const c = await row();
    assert.deepEqual([c.status, c.lastError], ["error", "undecryptable"]);
    assert.equal((await db.select().from(notifications)).length, 1);
  });

  it("two simultaneous first connects leave one readable connection", async () => {
    await Promise.all([
      conn.saveConnection({ userId: "e", tokens: tokens("refresh-a"), claims, config: config() }),
      conn.saveConnection({ userId: "e", tokens: tokens("refresh-b"), claims, config: config() }),
    ]);
    const all = await db.select().from(calendarConnections);
    assert.equal(all.length, 1);
    assert.equal(await conn.getAccessToken(all[0].id, config()), "access-0", "tokens decrypt under the surviving row's id");
  });

  it("disconnecting revokes at Google and deletes the connection and its queue", async () => {
    await conn.saveConnection({ userId: "e", tokens: tokens(), claims, config: config() });
    await db.insert(sessions).values(sessionRow("s1", "m", "e", "confirmed", -48));
    await conn.backfillUpcoming("e");
    assert.equal(await conn.disconnectGoogle("e", config()), true);
    assert.deepEqual(google.calls.map((c) => [c.path, c.form.token]), [["/revoke", "refresh-1"]]);
    assert.equal((await db.select().from(calendarConnections)).length, 0);
    assert.equal((await db.select().from(calendarOutbox)).length, 0);
  });

  it("still deletes the connection if Google's revoke fails", async () => {
    await conn.saveConnection({ userId: "e", tokens: tokens("revoke-fails"), claims, config: config() });
    assert.equal(await conn.disconnectGoogle("e", config()), true);
    assert.equal((await db.select().from(calendarConnections)).length, 0);
  });

  it("backfills only the user's upcoming confirmed sessions", async () => {
    await conn.saveConnection({ userId: "e", tokens: tokens(), claims, config: config() });
    await db.insert(sessions).values([
      sessionRow("up", "m", "e", "confirmed", -48),
      sessionRow("past", "m", "e", "confirmed", 48),
      sessionRow("req", "m", "e", "requested", -48),
      sessionRow("cxl", "m", "e", "cancelled", -48),
    ]);
    assert.equal(await conn.backfillUpcoming("e"), 1);
    assert.deepEqual((await db.select().from(calendarOutbox)).map((r) => r.sessionId), ["up"]);
  });

  it("summarises the connection without any token", async () => {
    await conn.saveConnection({ userId: "e", tokens: tokens(), claims, config: config() });
    const summary = await conn.getConnectionSummary("e");
    assert.deepEqual(Object.keys(summary).sort(), ["createdAt", "email", "status"]);
    assert.equal(await conn.getConnectionSummary("m"), null);
  });
});
