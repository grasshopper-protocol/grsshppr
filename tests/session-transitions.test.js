/**
 * Tests for src/lib/session-transitions.ts
 *
 * A status change must have the same effects whether it came from the in-app
 * buttons or a one-click email link (#140).
 *
 * Run: pnpm test
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { planTransitionEffects } from "../src/lib/session-transitions.js";

describe("planTransitionEffects", () => {
  it("confirming emails the mentee and resolves the confirm request", () => {
    assert.deepEqual(planTransitionEffects("confirmed"), {
      email: { to: "mentee", template: "confirmed" },
      resolveConfirmRequest: true,
      feedbackPrompts: false,
    });
  });

  it("cancelling or declining emails the other person and resolves the confirm request", () => {
    assert.deepEqual(planTransitionEffects("cancelled"), {
      email: { to: "other", template: "cancelled" },
      resolveConfirmRequest: true,
      feedbackPrompts: false,
    });
  });

  it("completing issues feedback prompts and sends no status email", () => {
    assert.deepEqual(planTransitionEffects("completed"), { email: null, resolveConfirmRequest: false, feedbackPrompts: true });
  });
});
