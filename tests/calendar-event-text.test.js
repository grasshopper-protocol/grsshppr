/**
 * Tests for src/lib/calendar/event-text.ts
 *
 * Every calendar copy of a session (feed, .ics download, Google event) must
 * say the same thing and carry no contact details or goals (RFC-0012, ADR-0015).
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sessionEventText } from "../src/lib/calendar/event-text.js";

const base = { partnerName: "Ada Lovelace", sessionUrl: "https://www.grsshppr.org/session/s1", videoUrl: null };

describe("sessionEventText", () => {
  it("names the partner from each side", () => {
    assert.equal(sessionEventText({ ...base, role: "mentor" }).summary, "Grsshppr session with Ada Lovelace");
    assert.match(sessionEventText({ ...base, role: "mentor" }).description, /^You're mentoring Ada Lovelace\./);
    assert.match(sessionEventText({ ...base, role: "mentee" }).description, /^Ada Lovelace is mentoring you\./);
  });

  it("puts the video link before the session link, and in Location", () => {
    const t = sessionEventText({ ...base, role: "mentee", videoUrl: "https://meet.google.com/abc" });
    assert.equal(t.location, "https://meet.google.com/abc");
    assert.ok(t.description.indexOf("Join video call") < t.description.indexOf("Session details"));
  });

  it("has no Location or video line without a link", () => {
    const t = sessionEventText({ ...base, role: "mentee" });
    assert.equal(t.location, undefined);
    assert.ok(!/video/i.test(t.description));
    assert.match(t.description, /Session details and shared notes: https:\/\/www\.grsshppr\.org\/session\/s1$/);
  });
});
