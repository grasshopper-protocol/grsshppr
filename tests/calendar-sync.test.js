/**
 * Tests for src/lib/calendar/sync.ts
 *
 * Calendar push writes into people's own calendars (RFC-0012, ADR-0014): the
 * reconcile table must never run out of order, retries must not duplicate
 * events, and events must carry no contact details.
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_SYNC_ATTEMPTS,
  classifyGoogleFailure,
  eventVideoUrl,
  failureOutcome,
  googleEventBody,
  googleEventId,
  nextAttempt,
  reconcileAction,
  videoHostConnection,
} from "../src/lib/calendar/sync.js";

describe("reconcileAction (RFC-0012 §5)", () => {
  it("follows the table", () => {
    assert.equal(reconcileAction("confirmed", false), "create");
    assert.equal(reconcileAction("confirmed", true), "update");
    assert.equal(reconcileAction("cancelled", true), "delete");
    assert.equal(reconcileAction("cancelled", false), "none");
    assert.equal(reconcileAction("requested", false), "none");
    assert.equal(reconcileAction("completed", true), "none");
  });
});

describe("googleEventId", () => {
  it("is deterministic, valid base32hex, and distinct per pair", () => {
    const a = googleEventId("s1", "c1");
    assert.equal(a, googleEventId("s1", "c1"));
    assert.match(a, /^[0-9a-v]{5,1024}$/);
    assert.notEqual(a, googleEventId("s1", "c2"));
  });
});

describe("videoHostConnection", () => {
  it("prefers the mentor, falls back to the mentee, else none", () => {
    assert.equal(videoHostConnection({ mentorConnectionId: "m", menteeConnectionId: "e" }), "m");
    assert.equal(videoHostConnection({ mentorConnectionId: null, menteeConnectionId: "e" }), "e");
    assert.equal(videoHostConnection({ mentorConnectionId: null, menteeConnectionId: null }), null);
  });
});

describe("googleEventBody", () => {
  const s = {
    id: "s1",
    startsAt: new Date("2026-10-27T06:00:00Z"),
    endsAt: new Date("2026-10-27T06:30:00Z"),
    partnerName: "Ada Mentor",
    role: "mentee",
    videoUrl: null,
  };
  const base = { baseUrl: "https://www.grsshppr.org", eventId: "abc123" };

  it("is private, in UTC, uses default reminders, and has no attendees", () => {
    const body = googleEventBody(s, { ...base, isVideoHost: false });
    assert.equal(body.visibility, "private");
    assert.deepEqual(body.start, { dateTime: "2026-10-27T06:00:00.000Z", timeZone: "UTC" });
    assert.deepEqual(body.reminders, { useDefault: true });
    assert.equal(body.attendees, undefined);
    assert.equal(body.id, "abc123");
    assert.ok(!/@/.test(JSON.stringify(body).replace(/https?:\/\/[^"]*/g, "")), "no email addresses");
  });

  it("asks for a Meet only on the host's event, and only until there is one", () => {
    assert.equal(googleEventBody(s, { ...base, isVideoHost: false }).conferenceData, undefined);
    const host = googleEventBody(s, { ...base, isVideoHost: true });
    assert.deepEqual(host.conferenceData.createRequest, { requestId: "s1", conferenceSolutionKey: { type: "hangoutsMeet" } });
    const withLink = googleEventBody({ ...s, videoUrl: "https://meet.google.com/abc-defg-hij" }, { ...base, isVideoHost: true });
    assert.equal(withLink.conferenceData, undefined);
    assert.match(withLink.description, /Video call: https:\/\/meet\.google\.com/);
  });

  it("describes the viewer's role", () => {
    assert.match(googleEventBody({ ...s, role: "mentor" }, { ...base, isVideoHost: false }).description, /You're mentoring/);
  });
});

describe("classifyGoogleFailure", () => {
  it("separates auth, transient, gone, conflict and permanent", () => {
    assert.equal(classifyGoogleFailure(400, "invalid_grant"), "auth");
    assert.equal(classifyGoogleFailure(401), "auth");
    for (const s of [null, 429, 500, 503]) assert.equal(classifyGoogleFailure(s), "transient", String(s));
    assert.equal(classifyGoogleFailure(403, "rateLimitExceeded"), "transient");
    assert.equal(classifyGoogleFailure(404), "gone");
    assert.equal(classifyGoogleFailure(410), "gone");
    assert.equal(classifyGoogleFailure(409), "conflict");
    assert.equal(classifyGoogleFailure(403, "forbidden"), "permanent");
    assert.equal(classifyGoogleFailure(400), "permanent");
  });
});

describe("nextAttempt", () => {
  const now = new Date("2026-10-26T00:00:00Z");
  it("backs off exponentially and parks after the last attempt", () => {
    assert.equal(nextAttempt(0, now).getTime() - now.getTime(), 3_600_000);
    assert.equal(nextAttempt(2, now).getTime() - now.getTime(), 4 * 3_600_000);
    assert.equal(nextAttempt(MAX_SYNC_ATTEMPTS - 1, now), null);
  });
});

describe("failureOutcome", () => {
  const now = new Date("2026-10-26T00:00:00Z");
  it("retries transient failures until attempts run out, then parks", () => {
    assert.deepEqual(failureOutcome("transient", 0, now), { kind: "retry", at: nextAttempt(0, now) });
    assert.deepEqual(failureOutcome("transient", MAX_SYNC_ATTEMPTS - 1, now), { kind: "park" });
  });

  it("holds rows for a broken grant and parks what Google will never accept", () => {
    assert.deepEqual(failureOutcome("auth", 0, now), { kind: "hold" });
    for (const f of ["permanent", "gone", "conflict"]) assert.deepEqual(failureOutcome(f, 0, now), { kind: "park" }, f);
  });
});

describe("eventVideoUrl", () => {
  it("reads the Meet link from hangoutLink or the video entry point", () => {
    assert.equal(eventVideoUrl({ hangoutLink: "https://meet.google.com/abc-defg-hij" }), "https://meet.google.com/abc-defg-hij");
    const entryPoints = [
      { entryPointType: "phone", uri: "tel:+1-555" },
      { entryPointType: "video", uri: "https://meet.google.com/xyz" },
    ];
    assert.equal(eventVideoUrl({ conferenceData: { entryPoints } }), "https://meet.google.com/xyz");
  });

  it("returns null while the Meet is pending or for anything that isn't https", () => {
    assert.equal(eventVideoUrl({}), null);
    assert.equal(eventVideoUrl({ conferenceData: {} }), null);
    assert.equal(eventVideoUrl({ hangoutLink: "javascript:alert(1)" }), null);
  });
});
