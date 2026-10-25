/**
 * Tests for src/lib/ical.ts
 *
 * Session exports and the calendar feed (RFC-0012) put user content — names,
 * goal titles — into iCalendar files. Escaping must stop that content from
 * injecting properties, and folding must keep every line within 75 octets
 * without corrupting multi-byte characters.
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCalendar, escapeText, foldLine, formatUtc } from "../src/lib/ical.js";

const NOW = new Date("2026-10-26T00:00:00Z");
const event = (overrides = {}) => ({
  uid: "session-abc@grsshppr.org",
  start: new Date("2026-10-27T06:00:00Z"),
  end: new Date("2026-10-27T06:30:00Z"),
  summary: "Session with Ada Mentor",
  ...overrides,
});
const unfold = (ics) => ics.replace(/\r\n /g, "");
const octets = (s) => new TextEncoder().encode(s).length;

describe("formatUtc", () => {
  it("formats an instant in UTC basic format", () => {
    assert.equal(formatUtc(new Date("2026-10-27T06:00:00.123Z")), "20261027T060000Z");
  });
});

describe("escapeText", () => {
  it("escapes backslash, semicolon, comma and newlines", () => {
    assert.equal(escapeText("a\\b;c,d\ne\r\nf"), "a\\\\b\\;c\\,d\\ne\\nf");
  });

  it("drops control characters but keeps tabs", () => {
    assert.equal(escapeText("a\u0000b\u0007c\td"), "abc\td");
  });
});

describe("foldLine", () => {
  it("leaves short lines alone", () => {
    assert.equal(foldLine("SUMMARY:short"), "SUMMARY:short");
  });

  it("folds long lines to at most 75 octets per physical line", () => {
    const folded = foldLine("DESCRIPTION:" + "x".repeat(200));
    for (const line of folded.split("\r\n")) assert.ok(octets(line) <= 75, `${octets(line)} octets`);
    assert.equal(folded.replace(/\r\n /g, ""), "DESCRIPTION:" + "x".repeat(200));
  });

  it("never splits a multi-byte character", () => {
    const value = "SUMMARY:" + "é😀".repeat(40);
    const folded = foldLine(value);
    for (const line of folded.split("\r\n")) {
      assert.ok(octets(line) <= 75);
      assert.ok(!line.includes("�"));
    }
    assert.equal(folded.replace(/\r\n /g, ""), value);
  });
});

describe("buildCalendar", () => {
  it("produces a CRLF-terminated VCALENDAR with the event", () => {
    const ics = buildCalendar({ events: [event()] }, NOW);
    assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
    assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
    assert.ok(!/[^\r]\n/.test(ics), "every line ends with CRLF");
    for (const line of ["UID:session-abc@grsshppr.org", "DTSTAMP:20261026T000000Z", "DTSTART:20261027T060000Z", "DTEND:20261027T063000Z", "SUMMARY:Session with Ada Mentor"]) {
      assert.ok(ics.includes(line + "\r\n"), line);
    }
  });

  it("can't be injected through a name containing a newline", () => {
    const ics = unfold(buildCalendar({ events: [event({ summary: "Mallory\r\nATTENDEE:mailto:evil@example.test" })] }, NOW));
    assert.ok(!/^ATTENDEE/m.test(ics), "no injected property line");
    assert.ok(ics.includes("SUMMARY:Mallory\\nATTENDEE:mailto:evil@example.test\r\n"));
  });

  it("strips line breaks from UID and URL", () => {
    const ics = unfold(buildCalendar({ events: [event({ uid: "id\r\nX-EVIL:1", url: "https://grsshppr.org/x\nX-EVIL:2" })] }, NOW));
    assert.ok(!/^X-EVIL/m.test(ics));
  });

  it("adds a display alarm when asked", () => {
    const ics = buildCalendar({ events: [event({ alarmMinutesBefore: 15 })] }, NOW);
    assert.ok(ics.includes("BEGIN:VALARM\r\nTRIGGER:-PT15M\r\nACTION:DISPLAY\r\n"));
  });

  it("names the calendar and lists several events", () => {
    const ics = buildCalendar({ name: "Grsshppr sessions", events: [event(), event({ uid: "session-def@grsshppr.org" })] }, NOW);
    assert.ok(ics.includes("X-WR-CALNAME:Grsshppr sessions\r\n"));
    assert.equal(ics.match(/BEGIN:VEVENT/g).length, 2);
  });

  it("supports an empty calendar (a feed with no sessions yet)", () => {
    const ics = buildCalendar({ events: [] }, NOW);
    assert.ok(!ics.includes("BEGIN:VEVENT"));
    assert.ok(ics.includes("BEGIN:VCALENDAR") && ics.includes("END:VCALENDAR"));
  });
});
