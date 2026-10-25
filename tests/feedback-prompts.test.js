/**
 * Tests for src/lib/feedback-prompts.ts
 *
 * The feedback prompt (notification + email) must go out at most once per
 * participant per session (#154), only inside the feedback window, and never
 * to or about the "Deleted user" placeholder (ADR-0016).
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  FEEDBACK_WINDOW_MS,
  feedbackState,
  isWithinFeedbackWindow,
  planFeedbackPrompts,
  promptKey,
} from "../src/lib/feedback-prompts.js";
import { DELETED_USER } from "../src/lib/account-deletion.js";

const NOW = new Date("2026-10-25T09:00:00Z");
const hoursAgo = (h) => new Date(NOW.getTime() - h * 3_600_000);

const session = (overrides) => ({
  id: "s1",
  mentorId: "mentor",
  menteeId: "mentee",
  endsAt: hoursAgo(30),
  ...overrides,
});

describe("isWithinFeedbackWindow", () => {
  it("includes a session that just ended", () => {
    assert.equal(isWithinFeedbackWindow(NOW, NOW), true);
  });

  it("includes the last moment of the window", () => {
    assert.equal(isWithinFeedbackWindow(new Date(NOW.getTime() - FEEDBACK_WINDOW_MS), NOW), true);
  });

  it("excludes sessions older than the window", () => {
    assert.equal(isWithinFeedbackWindow(new Date(NOW.getTime() - FEEDBACK_WINDOW_MS - 1), NOW), false);
  });

  it("excludes sessions that haven't ended yet", () => {
    assert.equal(isWithinFeedbackWindow(new Date(NOW.getTime() + 60_000), NOW), false);
  });
});

describe("planFeedbackPrompts", () => {
  it("prompts both participants of a recently completed session", () => {
    const plan = planFeedbackPrompts([session()], new Set(), NOW);
    assert.deepEqual(plan, [
      { sessionId: "s1", userId: "mentor", partnerId: "mentee" },
      { sessionId: "s1", userId: "mentee", partnerId: "mentor" },
    ]);
  });

  it("skips anyone already prompted or who already left feedback", () => {
    const plan = planFeedbackPrompts([session()], new Set([promptKey("s1", "mentor")]), NOW);
    assert.deepEqual(plan, [{ sessionId: "s1", userId: "mentee", partnerId: "mentor" }]);
  });

  it("plans nothing once both participants are handled", () => {
    const handled = new Set([promptKey("s1", "mentor"), promptKey("s1", "mentee")]);
    assert.deepEqual(planFeedbackPrompts([session()], handled, NOW), []);
  });

  it("ignores sessions outside the window", () => {
    assert.deepEqual(planFeedbackPrompts([session({ endsAt: hoursAgo(24 * 8) })], new Set(), NOW), []);
  });

  it("ignores sessions marked complete before they ended", () => {
    assert.deepEqual(planFeedbackPrompts([session({ endsAt: new Date(NOW.getTime() + 600_000) })], new Set(), NOW), []);
  });

  it("prompts no one when a participant has deleted their account", () => {
    assert.deepEqual(planFeedbackPrompts([session({ menteeId: DELETED_USER.id })], new Set(), NOW), []);
    assert.deepEqual(planFeedbackPrompts([session({ mentorId: DELETED_USER.id })], new Set(), NOW), []);
  });

  it("keys pairs by session and user", () => {
    assert.notEqual(promptKey("s1", "u2"), promptKey("s1", "u1"));
    assert.equal(promptKey("s1", "u1"), "s1:u1");
  });
});

describe("feedbackState", () => {
  const base = { status: "completed", endsAt: hoursAgo(30), partnerId: "mentor", hasGiven: false, now: NOW };

  it("is open for a completed session inside the window", () => {
    assert.equal(feedbackState(base), "open");
  });

  it("is given once the participant has rated it", () => {
    assert.equal(feedbackState({ ...base, hasGiven: true }), "given");
  });

  it("is closed after the window", () => {
    assert.equal(feedbackState({ ...base, endsAt: hoursAgo(24 * 8) }), "closed");
  });

  it("is none before the session has ended", () => {
    assert.equal(feedbackState({ ...base, endsAt: new Date(NOW.getTime() + 600_000) }), "none");
  });

  it("is none for sessions that aren't completed", () => {
    assert.equal(feedbackState({ ...base, status: "confirmed" }), "none");
  });

  it("is none when the partner has deleted their account", () => {
    assert.equal(feedbackState({ ...base, partnerId: DELETED_USER.id }), "none");
  });
});
