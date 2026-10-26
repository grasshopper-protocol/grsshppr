/**
 * Tests for src/lib/calendar/config.ts
 *
 * Calendar push must stay off unless fully configured (RFC-0012 §8), and a
 * malformed encryption key must fail loudly rather than silently weaken.
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { calendarConfig, canConnectCalendar } from "../src/lib/calendar/config.js";

const key = randomBytes(32).toString("base64");
const full = {
  CALENDAR_SYNC_ENABLED: "true",
  GOOGLE_CALENDAR_CLIENT_ID: "cid",
  GOOGLE_CALENDAR_CLIENT_SECRET: "secret",
  CALENDAR_TOKEN_ENC_KEY: key,
};

describe("calendarConfig", () => {
  it("is on only when the flag and everything else are set", () => {
    const c = calendarConfig(full);
    assert.equal(c.enabled, true);
    assert.equal(c.keys.current.length, 32);
    assert.equal(c.keys.previous, undefined);
  });

  it("is off when the flag isn't exactly 'true'", () => {
    for (const flag of [undefined, "false", "1", "TRUE"]) {
      assert.deepEqual(calendarConfig({ ...full, CALENDAR_SYNC_ENABLED: flag }), { enabled: false }, String(flag));
    }
  });

  it("is off when credentials or the key are missing", () => {
    for (const k of ["GOOGLE_CALENDAR_CLIENT_ID", "GOOGLE_CALENDAR_CLIENT_SECRET", "CALENDAR_TOKEN_ENC_KEY"]) {
      assert.deepEqual(calendarConfig({ ...full, [k]: undefined }), { enabled: false }, k);
    }
  });

  it("fails closed on a malformed key, including the previous one", () => {
    assert.throws(() => calendarConfig({ ...full, CALENDAR_TOKEN_ENC_KEY: "too-short" }), /32 bytes/);
    assert.throws(() => calendarConfig({ ...full, CALENDAR_TOKEN_ENC_KEY_PREVIOUS: "bad" }), /32 bytes/);
  });

  it("accepts a previous key for rotation", () => {
    const c = calendarConfig({ ...full, CALENDAR_TOKEN_ENC_KEY_PREVIOUS: randomBytes(32).toString("base64") });
    assert.equal(c.keys.previous.length, 32);
  });
});

describe("canConnectCalendar (soak allow-list)", () => {
  it("lets everyone connect when no allow-list is set", () => {
    assert.equal(canConnectCalendar(calendarConfig(full), "anyone@example.test"), true);
    assert.equal(calendarConfig({ ...full, CALENDAR_SYNC_ALLOWED_USERS: " , " }).allowedEmails, null);
  });

  it("lets only listed emails connect, ignoring case and spaces", () => {
    const c = calendarConfig({ ...full, CALENDAR_SYNC_ALLOWED_USERS: " Sam@Example.test, kai@example.test " });
    assert.deepEqual(c.allowedEmails, ["sam@example.test", "kai@example.test"]);
    assert.equal(canConnectCalendar(c, "sam@example.TEST"), true);
    assert.equal(canConnectCalendar(c, "other@example.test"), false);
    assert.equal(canConnectCalendar(c, null), false);
  });

  it("lets no one connect when sync is off", () => {
    assert.equal(canConnectCalendar(calendarConfig({}), "sam@example.test"), false);
  });
});
