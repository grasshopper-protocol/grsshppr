/**
 * Tests for src/lib/notifications.ts
 *
 * Info notifications must clear when opened, or the bell keeps showing them;
 * action notifications must stay until the action is taken (#159).
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CALENDAR_RECONNECT, bellClick } from "../src/lib/notifications.js";

describe("bellClick", () => {
  it("opens the session and marks an info notification read", () => {
    assert.deepEqual(bellClick({ priority: "info", resourceId: "s1" }), { href: "/session/s1", markRead: true });
  });

  it("opens the session but leaves an action notification unread", () => {
    assert.deepEqual(bellClick({ priority: "action", resourceId: "s1" }), { href: "/session/s1", markRead: false });
  });

  it("marks an info notification without a target read and goes nowhere", () => {
    assert.deepEqual(bellClick({ priority: "info", resourceId: null }), { href: null, markRead: true });
  });

  it("sends a calendar reconnect to Settings and leaves it unread until reconnected", () => {
    assert.deepEqual(bellClick({ type: CALENDAR_RECONNECT, priority: "action", resourceId: "conn-1" }), {
      href: "/settings#calendar",
      markRead: false,
    });
  });
});
