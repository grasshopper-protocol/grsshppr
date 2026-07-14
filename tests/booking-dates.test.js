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
import { toDateStr, zonedTimeToUtc } from "../src/lib/booking-dates.js";

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
