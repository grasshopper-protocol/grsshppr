/**
 * Tests for src/lib/booking-dates.ts
 *
 * Covers the two faults from the 2026-06-23 booking postmortem (ADR-0004):
 *   1. toDateStr must use local date parts, not toISOString() — which rolls
 *      back a day in positive-UTC zones (SGT UTC+8, JST UTC+9 etc.)
 *   2. zonedTimeToUtc must produce a real UTC instant that survives DST.
 *
 * Run: node --test  (Node ≥ 18 built-in test runner, no install needed)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  toDateStr,
  zonedTimeToUtc,
  getMonday,
  slotsForWeek,
} from "../src/lib/booking-dates.js";

// ---------------------------------------------------------------------------
// toDateStr
// ---------------------------------------------------------------------------

describe("toDateStr", () => {
  it("returns YYYY-MM-DD from local date parts", () => {
    // Construct a local date unambiguously (no UTC shift risk)
    const d = new Date(2026, 5, 23); // June 23 2026 local midnight
    assert.equal(toDateStr(d), "2026-06-23");
  });

  it("pads single-digit month and day", () => {
    const d = new Date(2026, 0, 5); // Jan 5
    assert.equal(toDateStr(d), "2026-01-05");
  });

  it("would fail if implemented via toISOString() in a +8 zone (documents the bug)", () => {
    // This test validates the *contract* rather than simulating a timezone env.
    // In UTC+8, midnight local is UTC-8h the previous day, so toISOString()
    // returns the day before. Our implementation must NOT use toISOString().
    // We verify by checking the function body doesn't call it.
    const src = toDateStr.toString();
    assert.ok(!src.includes("toISOString"), "toDateStr must not use toISOString()");
  });
});

// ---------------------------------------------------------------------------
// zonedTimeToUtc
// ---------------------------------------------------------------------------

describe("zonedTimeToUtc", () => {
  it("UTC zone: wall clock equals UTC", () => {
    const result = zonedTimeToUtc("2026-06-23", "09:00", "UTC");
    assert.equal(result.toISOString(), "2026-06-23T09:00:00.000Z");
  });

  it("UTC-5 (EST, no DST in winter): shifts +5h to UTC", () => {
    // 09:00 EST = 14:00 UTC
    const result = zonedTimeToUtc("2026-01-15", "09:00", "America/New_York");
    assert.equal(result.toISOString(), "2026-01-15T14:00:00.000Z");
  });

  it("UTC+8 (SGT): shifts -8h to UTC — the postmortem zone", () => {
    // 09:00 SGT = 01:00 UTC same day (not the previous day)
    const result = zonedTimeToUtc("2026-06-23", "09:00", "Asia/Singapore");
    assert.equal(result.toISOString(), "2026-06-23T01:00:00.000Z");
  });

  it("EDT (UTC-4, summer DST): 09:00 EDT = 13:00 UTC", () => {
    const result = zonedTimeToUtc("2026-06-23", "09:00", "America/New_York");
    assert.equal(result.toISOString(), "2026-06-23T13:00:00.000Z");
  });

  it("returns a Date with a numeric UTC timestamp (not NaN)", () => {
    const result = zonedTimeToUtc("2026-06-23", "14:30", "Europe/London");
    assert.ok(!Number.isNaN(result.getTime()), "result must be a valid Date");
  });

  it("produces an offset-aware ISO string (Z suffix) — satisfies z.string().datetime()", () => {
    const result = zonedTimeToUtc("2026-06-23", "10:00", "UTC");
    // z.string().datetime() requires Z or +offset. toISOString() always emits Z.
    assert.ok(result.toISOString().endsWith("Z"), "must end with Z");
  });
});

// ---------------------------------------------------------------------------
// getMonday
// ---------------------------------------------------------------------------

describe("getMonday", () => {
  it("returns the same day when given a Monday", () => {
    // 2026-06-22 is a Monday
    const mon = getMonday(new Date(2026, 5, 22, 15, 30));
    assert.equal(toDateStr(mon), "2026-06-22");
  });

  it("maps mid-week days back to that week's Monday", () => {
    // 2026-06-25 is a Thursday → Monday 2026-06-22
    assert.equal(toDateStr(getMonday(new Date(2026, 5, 25))), "2026-06-22");
  });

  it("maps Sunday back to the Monday that started the week (not the next one)", () => {
    // 2026-06-28 is a Sunday → Monday 2026-06-22
    assert.equal(toDateStr(getMonday(new Date(2026, 5, 28))), "2026-06-22");
  });

  it("normalizes the time to local midnight", () => {
    const mon = getMonday(new Date(2026, 5, 25, 23, 59, 59));
    assert.equal(mon.getHours(), 0);
    assert.equal(mon.getMinutes(), 0);
    assert.equal(mon.getSeconds(), 0);
  });
});

// ---------------------------------------------------------------------------
// slotsForWeek
// ---------------------------------------------------------------------------

describe("slotsForWeek", () => {
  const monday = new Date(2026, 5, 22); // Mon 2026-06-22, local midnight

  it("lays out slots of sessionDuration length that fit inside the window", () => {
    // Monday 09:00–10:30 UTC, 30-min sessions → 09:00, 09:30, 10:00 (3 slots)
    const windows = [{ dayOfWeek: 1, startTime: "09:00", endTime: "10:30" }];
    const slots = slotsForWeek(monday, windows, 30, "UTC");
    assert.equal(slots.length, 3);
    assert.equal(slots[0].startsAt, "2026-06-22T09:00:00.000Z");
    assert.equal(slots[0].endsAt, "2026-06-22T09:30:00.000Z");
    assert.equal(slots[2].startsAt, "2026-06-22T10:00:00.000Z");
  });

  it("drops a trailing partial slot that would overrun the window", () => {
    // 09:00–10:00 with 45-min sessions → only 09:00 fits (09:45 would end 10:30)
    const windows = [{ dayOfWeek: 1, startTime: "09:00", endTime: "10:00" }];
    const slots = slotsForWeek(monday, windows, 45, "UTC");
    assert.equal(slots.length, 1);
    assert.equal(slots[0].startsAt, "2026-06-22T09:00:00.000Z");
  });

  it("places a slot on the correct calendar day for the window's dayOfWeek", () => {
    // Wednesday window (dayOfWeek 3) → 2026-06-24
    const windows = [{ dayOfWeek: 3, startTime: "08:00", endTime: "08:30" }];
    const slots = slotsForWeek(monday, windows, 30, "UTC");
    assert.equal(slots[0].startsAt, "2026-06-24T08:00:00.000Z");
  });

  it("places a Sunday window at the end of the week (dayOfWeek 0)", () => {
    // Sunday maps 6 days after Monday → 2026-06-28
    const windows = [{ dayOfWeek: 0, startTime: "10:00", endTime: "10:30" }];
    const slots = slotsForWeek(monday, windows, 30, "UTC");
    assert.equal(slots[0].startsAt, "2026-06-28T10:00:00.000Z");
  });

  it("merges multiple windows and returns them sorted ascending", () => {
    const windows = [
      { dayOfWeek: 3, startTime: "08:00", endTime: "08:30" },
      { dayOfWeek: 1, startTime: "09:00", endTime: "09:30" },
    ];
    const slots = slotsForWeek(monday, windows, 30, "UTC");
    const starts = slots.map((s) => s.startsAt);
    assert.deepEqual(starts, [...starts].sort());
    assert.equal(starts[0], "2026-06-22T09:00:00.000Z"); // Monday before Wednesday
  });

  it("converts wall-clock windows through the mentor's timezone (SGT UTC+8)", () => {
    // 09:00 SGT on Monday = 01:00 UTC same day — the postmortem zone
    const windows = [{ dayOfWeek: 1, startTime: "09:00", endTime: "09:30" }];
    const slots = slotsForWeek(monday, windows, 30, "Asia/Singapore");
    assert.equal(slots[0].startsAt, "2026-06-22T01:00:00.000Z");
  });

  it("returns an empty list when no window can fit a session", () => {
    const windows = [{ dayOfWeek: 1, startTime: "09:00", endTime: "09:20" }];
    assert.deepEqual(slotsForWeek(monday, windows, 30, "UTC"), []);
  });
});
