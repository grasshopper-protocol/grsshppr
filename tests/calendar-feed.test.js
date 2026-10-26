/**
 * Tests for src/lib/calendar-feed.ts
 *
 * The subscription feed is reachable by anyone with its URL (RFC-0012 §1), so
 * the token must be unguessable and strictly parsed, only its hash stored, and
 * the events must never carry email addresses or goals.
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FEED_FUTURE_DAYS,
  FEED_PAST_DAYS,
  feedEvents,
  feedUrls,
  feedWindow,
  generateFeedToken,
  hashFeedToken,
  parseFeedFile,
} from "../src/lib/calendar-feed.js";

const NOW = new Date("2026-10-26T00:00:00Z");
const session = (overrides = {}) => ({
  id: "s1",
  status: "confirmed",
  startsAt: new Date("2026-10-27T06:00:00Z"),
  endsAt: new Date("2026-10-27T06:30:00Z"),
  videoUrl: null,
  partnerName: "Ada Mentor",
  role: "mentee",
  ...overrides,
});

describe("tokens", () => {
  it("generates 43-character base64url tokens that differ every time", () => {
    const a = generateFeedToken();
    const b = generateFeedToken();
    assert.match(a, /^[A-Za-z0-9_-]{43}$/);
    assert.notEqual(a, b);
  });

  it("hashes deterministically to SHA-256 hex", () => {
    assert.equal(hashFeedToken("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("parses only well-formed <token>.ics segments", () => {
    const token = "A".repeat(43);
    assert.equal(parseFeedFile(`${token}.ics`), token);
    for (const bad of [token, `${token}.ICS`, `${"A".repeat(42)}.ics`, `${token}x.ics`, `../${token}.ics`, `${token}.ics.ics`, ""]) {
      assert.equal(parseFeedFile(bad), null, bad);
    }
  });
});

describe("feedWindow", () => {
  it("spans the past and future window around now", () => {
    const { from, to } = feedWindow(NOW);
    assert.equal(NOW.getTime() - from.getTime(), FEED_PAST_DAYS * 86_400_000);
    assert.equal(to.getTime() - NOW.getTime(), FEED_FUTURE_DAYS * 86_400_000);
  });
});

describe("feedEvents", () => {
  it("lists confirmed and completed sessions only", () => {
    const events = feedEvents(
      [session(), session({ id: "s2", status: "completed" }), session({ id: "s3", status: "cancelled" }), session({ id: "s4", status: "requested" })],
      "https://www.grsshppr.org"
    );
    assert.deepEqual(events.map((e) => e.uid), ["session-s1@grsshppr.org", "session-s2@grsshppr.org"]);
  });

  it("names the partner, links the session, and carries no emails or goals", () => {
    const [e] = feedEvents([session({ role: "mentor", partnerName: "Sam Mentee" })], "https://www.grsshppr.org");
    assert.equal(e.summary, "Grsshppr session with Sam Mentee");
    assert.equal(e.url, "https://www.grsshppr.org/session/s1");
    assert.match(e.description, /You're mentoring Sam Mentee\./);
    assert.ok(!/@|goal/i.test(e.summary + e.description.replace("grsshppr.org", "")));
  });

  it("describes a mentee's sessions from their side", () => {
    assert.match(feedEvents([session({ partnerName: "Ada" })], "https://x.test")[0].description, /Ada is mentoring you\./);
  });

  it("carries the video link for confirmed sessions, as a one-tap Location too", () => {
    const meet = "https://meet.google.com/abc-defg-hij";
    const [e] = feedEvents([session({ videoUrl: meet })], "https://x.test");
    assert.equal(e.location, meet);
    assert.match(e.description, /Join video call: https:\/\/meet\.google\.com\/abc-defg-hij/);
    const [past] = feedEvents([session({ status: "completed", videoUrl: meet })], "https://x.test");
    assert.equal(past.location, undefined, "a finished session's call is over");
  });
});

describe("feedUrls", () => {
  it("builds https, webcal and Google subscribe links", () => {
    const urls = feedUrls("https://www.grsshppr.org", "TOKEN");
    assert.equal(urls.https, "https://www.grsshppr.org/api/calendar/feed/TOKEN.ics");
    assert.equal(urls.webcal, "webcal://www.grsshppr.org/api/calendar/feed/TOKEN.ics");
    assert.equal(urls.google, "https://calendar.google.com/calendar/r?cid=" + encodeURIComponent(urls.webcal));
  });

  it("handles a plain-http base in development", () => {
    assert.equal(feedUrls("http://localhost:3000", "T").webcal, "webcal://localhost:3000/api/calendar/feed/T.ics");
  });
});
